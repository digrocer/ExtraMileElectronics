import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { pinEnroll, pinLock, pinReset, pinStatus, pinUnlock, sessionReseal } from '../lib/tauri';

type Role = 'customer' | 'staff' | 'admin' | null;

/**
 * loading — checking whether this device is enrolled
 * enroll  — one-time bind of a real admin account, then set a 6-digit PIN
 * locked  — enrolled; waiting for the PIN to unlock the stored session
 * ready   — session restored; full back-office access
 */
export type Phase = 'loading' | 'enroll' | 'locked' | 'ready';

interface AuthState {
  phase: Phase;
  user: User | null;
  role: Role;
  error: string | null;
  /** First-time device enrolment: verify an admin account once, then seal it under `pin`. */
  enroll: (email: string, password: string, pin: string) => Promise<void>;
  /** Daily unlock — restores the stored Supabase session from the PIN. */
  unlock: (pin: string) => Promise<void>;
  /** Idle/manual lock — drops the session, keeps the enrolment (PIN re-entry). */
  lock: () => void;
  /** Forget this device — wipes the vault and returns to enrolment. */
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth used outside AuthProvider');
  return c;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [error, setError] = useState<string | null>(null);

  // Post-restore staff gate — the bound account must still be staff/admin (D-02).
  // Returns the role on success, or null (and signs the local session out) otherwise.
  const gate = useCallback(async (u: User): Promise<Role> => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', u.id)
      .returns<{ role: 'customer' | 'staff' | 'admin' }[]>();
    const r = data?.[0]?.role ?? null;
    if (r === 'staff' || r === 'admin') return r;
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const enrolled = await pinStatus();
      if (mounted) setPhase(enrolled ? 'locked' : 'enroll');
    })();

    // Persist rotated refresh tokens back into the vault (cached key, no PIN prompt).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.refresh_token) {
        void sessionReseal(session.refresh_token).catch(() => {});
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const enroll = useCallback(
    async (email: string, password: string, pin: string) => {
      setError(null);
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e || !data.user || !data.session) {
        setError(e?.message ?? 'Sign-in failed.');
        return;
      }
      const r = await gate(data.user);
      if (!r) {
        setError('This account has no back-office access.');
        return;
      }
      try {
        await pinEnroll(pin, data.session.refresh_token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not set PIN.');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
      setUser(data.user);
      setRole(r);
      setPhase('ready');
    },
    [gate],
  );

  const unlock = useCallback(
    async (pin: string) => {
      setError(null);
      let refreshToken: string;
      try {
        refreshToken = await pinUnlock(pin);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith('wrong_pin:')) {
          setError(`Wrong PIN — ${msg.split(':')[1]} attempts left.`);
        } else if (msg === 'wiped') {
          setError('Too many wrong PINs. This device was wiped — re-enrol.');
          setPhase('enroll');
        } else {
          setError('Unlock failed.');
        }
        return;
      }
      const { data, error: e } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (e || !data.user) {
        setError('Stored session expired — forget this device and re-enrol.');
        return;
      }
      const r = await gate(data.user);
      if (!r) {
        setError('This account no longer has back-office access.');
        await pinReset();
        setPhase('enroll');
        return;
      }
      setUser(data.user);
      setRole(r);
      setPhase('ready');
    },
    [gate],
  );

  const lock = useCallback(() => {
    // Drop the live session so auto-refresh stops rotating the token past what's
    // sealed (scope 'local' keeps the sealed refresh token valid for unlock).
    void supabase.auth.signOut({ scope: 'local' });
    void pinLock();
    setUser(null);
    setRole(null);
    setError(null);
    setPhase('locked');
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    await pinReset();
    setUser(null);
    setRole(null);
    setError(null);
    setPhase('enroll');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ phase, user, role, error, enroll, unlock, lock, signOut }),
    [phase, user, role, error, enroll, unlock, lock, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

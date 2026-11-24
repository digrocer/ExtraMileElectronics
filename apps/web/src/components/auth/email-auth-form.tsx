'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const inputClass = 'field';

/** Email OTP (magic link) + email/password fallback. docs/05-OAUTH.md §1. */
export function EmailAuthForm({ next = '/' }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function sendMagicLink() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setNotice('Check your email for a sign-in link.');
  }

  return (
    <form className="space-y-3" onSubmit={signInPassword}>
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      {notice && <p className="text-[13px] text-success">{notice}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy || !email}>
        {busy ? 'Working…' : 'Sign in'}
      </button>
      <button
        type="button"
        className="btn w-full text-[15px] text-primary hover:bg-primary/5"
        disabled={busy || !email}
        onClick={sendMagicLink}
      >
        Email me a magic link instead
      </button>
    </form>
  );
}

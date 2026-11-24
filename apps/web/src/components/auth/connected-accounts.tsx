'use client';

import type { UserIdentity } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const LINKABLE: { provider: 'google' | 'apple'; label: string }[] = [
  { provider: 'google', label: 'Google' },
  { provider: 'apple', label: 'Apple' },
];

/**
 * Manage linked identities (docs/05-OAUTH.md §7). Manual linking must be enabled in
 * Supabase. Unlink is blocked when it is the last identity (would lock the user out).
 */
export function ConnectedAccounts() {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.getUserIdentities();
    if (err) setError(err.message);
    setIdentities(data?.identities ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function link(provider: 'google' | 'apple') {
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/account/connected-accounts`,
      },
    });
    if (err) setError(err.message);
  }

  async function unlink(identity: UserIdentity) {
    setError(null);
    if (identities.length <= 1) {
      setError('You cannot remove your last sign-in method.');
      return;
    }
    const supabase = createClient();
    const { error: err } = await supabase.auth.unlinkIdentity(identity);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const linkedProviders = new Set(identities.map((i) => i.provider));

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="grouped">
        {identities.map((identity) => (
          <li key={identity.identity_id} className="flex items-center justify-between px-4 py-3">
            <span className="text-[17px] capitalize">{identity.provider}</span>
            <button
              type="button"
              className="text-[15px] font-medium text-destructive disabled:opacity-30"
              disabled={identities.length <= 1}
              onClick={() => unlink(identity)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="field-label">Add a sign-in method</p>
        <div className="flex gap-2">
          {LINKABLE.filter((p) => !linkedProviders.has(p.provider)).map((p) => (
            <button
              key={p.provider}
              type="button"
              className="btn-tinted btn-sm"
              onClick={() => link(p.provider)}
            >
              Link {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

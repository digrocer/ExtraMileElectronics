'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Provider = 'google' | 'apple';

export function OAuthButtons({ next = '/' }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    setError(null);
    setBusy(provider);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams:
          provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : undefined,
      },
    });
    if (err) {
      setBusy(null);
      setError('Could not start sign-in. Try email instead.');
    }
    // On success the browser is redirected to the provider.
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn w-full bg-card text-[15px] text-foreground ring-1 ring-black/10 hover:bg-black/[0.03]"
        disabled={busy !== null}
        onClick={() => signIn('google')}
      >
        {busy === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        className="btn w-full bg-foreground text-[15px] text-background hover:bg-foreground/90"
        disabled={busy !== null}
        onClick={() => signIn('apple')}
      >
        {busy === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

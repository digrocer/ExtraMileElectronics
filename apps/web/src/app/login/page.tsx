import type { Metadata } from 'next';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { EmailAuthForm } from '@/components/auth/email-auth-form';
import { sanitizeNext } from '@/lib/auth/next';

export const metadata: Metadata = { title: 'Sign in' };

const ERRORS: Record<string, string> = {
  missing_code: 'That sign-in link was incomplete. Please try again.',
  oauth_failed: 'Sign-in did not complete. Please try again.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNext(params.next);
  const errorMessage = params.error ? (ERRORS[params.error] ?? 'Something went wrong.') : null;

  return (
    <main className="container flex min-h-[calc(100dvh-3.5rem)] items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-xl bg-foreground text-2xl font-bold text-background">
            E
          </span>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-[15px] text-muted-foreground">Track orders and check out faster.</p>
        </div>

        <div className="panel space-y-5">
          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <OAuthButtons next={next} />

          <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="h-px flex-1 bg-black/[0.08]" />
            or
            <span className="h-px flex-1 bg-black/[0.08]" />
          </div>

          <EmailAuthForm next={next} />
        </div>
      </div>
    </main>
  );
}

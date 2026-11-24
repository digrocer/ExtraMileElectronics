'use client';

import { AlertTriangle } from 'lucide-react';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <AlertTriangle className="size-14 text-[#FF9500]" aria-hidden />
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="max-w-prose text-[17px] text-muted-foreground">
          Please try again. If it keeps happening, contact support with the time this occurred.
        </p>
      </div>
      <button type="button" className="btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

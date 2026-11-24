'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container flex min-h-[50vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <AlertTriangle className="size-14 text-[#FF9500]" aria-hidden />
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold">Checkout hit a snag</h1>
        <p className="text-[17px] text-muted-foreground">
          Your bag is safe and you haven&apos;t been charged. Please try again.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          Retry
        </button>
        <Link href="/cart" className="btn-tinted">
          Back to bag
        </Link>
      </div>
    </main>
  );
}

import { SearchX } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <SearchX className="size-14 text-muted-foreground/50" aria-hidden />
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="text-[17px] text-muted-foreground">We couldn&apos;t find that page.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Go home
        </Link>
        <Link href="/search" className="btn-tinted">
          Search
        </Link>
      </div>
    </main>
  );
}

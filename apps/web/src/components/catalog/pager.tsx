import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const pill =
  'pressable inline-flex h-10 items-center gap-1 rounded-lg bg-card px-4 text-[15px] font-medium text-primary shadow-[0_1px_2px_rgba(0,0,0,0.06)]';

export function Pager({ prevHref, nextHref }: { prevHref?: string; nextHref?: string }) {
  if (!prevHref && !nextHref) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      {prevHref ? (
        <Link className={pill} href={prevHref}>
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </Link>
      ) : (
        <span />
      )}
      {nextHref && (
        <Link className={pill} href={nextHref}>
          Next <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

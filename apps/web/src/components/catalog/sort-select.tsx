'use client';

import { ChevronDown } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const OPTIONS: [string, string][] = [
  ['relevance', 'Relevance'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['newest', 'Newest'],
  ['rating', 'Top rated'],
];

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set('sort', e.target.value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        onChange={onChange}
        className="h-9 appearance-none rounded-lg bg-card pl-4 pr-9 text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {OPTIONS.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 size-4 text-muted-foreground"
        aria-hidden
      />
    </label>
  );
}

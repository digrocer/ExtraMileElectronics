'use client';

import { useEffect, useState } from 'react';

/** Cart badge. Fetches count client-side so the root layout stays static/ISR. */
export function CartCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch('/api/cart/count')
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .then((d: { count?: number }) => {
          if (active) setCount(d.count ?? 0);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener('cart:changed', load);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      window.removeEventListener('cart:changed', load);
      window.removeEventListener('focus', load);
    };
  }, []);

  if (!count) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white ring-2 ring-background">
      {count}
    </span>
  );
}

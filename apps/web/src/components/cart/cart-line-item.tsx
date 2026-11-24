'use client';

import { formatGHS } from '@extramile/core';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { removeItemAction, setQtyAction } from '@/lib/cart/actions';
import type { CartLine } from '@/lib/cart/cart';
import { tintFor } from '@/lib/catalog/tint';

function attrsLabel(attrs: Record<string, unknown>): string {
  return Object.values(attrs)
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map(String)
    .join(' · ');
}

const stepBtn =
  'pressable flex size-8 items-center justify-center rounded-full hover:bg-card disabled:opacity-30';

export function CartLineItem({ line }: { line: CartLine }) {
  const router = useRouter();
  const [qty, setQty] = useState(line.qty);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function notifyChanged() {
    window.dispatchEvent(new Event('cart:changed'));
    router.refresh();
  }

  function change(next: number) {
    const prev = qty;
    setError(null);
    setQty(Math.max(next, 0)); // optimistic
    startTransition(async () => {
      if (next <= 0) {
        await removeItemAction(line.variantId);
      } else {
        const res = await setQtyAction(line.variantId, next);
        if (!res.ok) {
          setQty(prev);
          setError(res.error);
          return;
        }
        if (res.qty !== next) setQty(res.qty);
      }
      notifyChanged();
    });
  }

  const label = attrsLabel(line.attrs);

  return (
    <li className={`flex gap-4 p-4 transition-opacity ${pending ? 'opacity-60' : ''}`}>
      <Link
        href={`/p/${line.slug}`}
        className={`relative size-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${tintFor(line.slug)}`}
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.title}
            fill
            sizes="96px"
            unoptimized={line.imageUrl.endsWith('.svg')}
            className="object-contain p-2"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/p/${line.slug}`}
              className="line-clamp-2 text-[17px] font-semibold hover:underline"
            >
              {line.title}
            </Link>
            {label && <p className="text-[13px] text-muted-foreground">{label}</p>}
          </div>
          <p className="shrink-0 text-[17px] font-semibold">{formatGHS(line.lineTotal)}</p>
        </div>

        <p className="mt-0.5 text-[13px] text-muted-foreground">{formatGHS(line.unitPrice)} each</p>
        {line.stale && (
          <p className="text-[13px] text-[#C26A00]">Price updated since you added this.</p>
        )}
        {!line.isActive && <p className="text-[13px] text-destructive">No longer available.</p>}

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="inline-flex items-center rounded-full bg-secondary p-0.5">
            <button
              type="button"
              className={stepBtn}
              onClick={() => change(qty - 1)}
              disabled={pending}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span className="w-7 text-center text-[15px] font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              className={stepBtn}
              onClick={() => change(qty + 1)}
              disabled={pending || qty >= line.available}
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => change(0)}
            disabled={pending}
            className="pressable inline-flex items-center gap-1 text-[15px] font-medium text-destructive disabled:opacity-40"
          >
            <Trash2 className="size-4" aria-hidden /> Remove
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
      </div>
    </li>
  );
}

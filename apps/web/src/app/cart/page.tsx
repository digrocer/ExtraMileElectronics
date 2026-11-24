import { formatGHS } from '@extramile/core';
import { ShoppingBag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CartLineItem } from '@/components/cart/cart-line-item';
import { getCart } from '@/lib/cart/cart';

export const metadata: Metadata = { title: 'Your bag' };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <main className="container flex max-w-md flex-col items-center gap-5 py-24 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-card text-muted-foreground">
          <ShoppingBag className="size-9" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold">Your bag is empty</h1>
          <p className="text-[17px] text-muted-foreground">
            Find a phone, laptop or TV to get started.
          </p>
        </div>
        <Link href="/search" className="btn-primary">
          Browse the catalogue
        </Link>
      </main>
    );
  }

  const hasStale = cart.lines.some((l) => l.stale);
  const count = cart.lines.reduce((n, l) => n + l.qty, 0);

  return (
    <main className="container max-w-5xl pb-20 pt-6">
      <h1 className="large-title">Bag</h1>
      <p className="mb-6 mt-1 text-[15px] text-muted-foreground">
        {count} {count === 1 ? 'item' : 'items'}
      </p>

      {hasStale && (
        <p className="mb-4 rounded-2xl bg-[#FF9500]/10 px-4 py-3 text-[15px] text-[#A35400]">
          Some prices changed since you added them. The totals below are current.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <ul className="grouped">
          {cart.lines.map((line) => (
            <CartLineItem key={line.variantId} line={line} />
          ))}
        </ul>

        <aside className="panel h-fit space-y-4 lg:sticky lg:top-20">
          <h2 className="text-xl font-bold">Summary</h2>
          <dl className="space-y-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{formatGHS(cart.subtotal)}</dd>
            </div>
            {cart.savings > 0 && (
              <div className="flex justify-between text-success">
                <dt>You save</dt>
                <dd className="font-medium">{formatGHS(cart.savings)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="text-muted-foreground">At checkout</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary w-full">
            Check out
          </Link>
          <p className="text-center text-[13px] text-muted-foreground">
            Discount codes are applied at checkout.
          </p>
        </aside>
      </div>
    </main>
  );
}

import { formatGHS } from '@extramile/core';
import { ChevronRight, Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { StatusPill } from '@/components/account/status-pill';
import { listUserOrders } from '@/lib/orders/queries';

export const metadata: Metadata = { title: 'Your orders' };
export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const orders = await listUserOrders();

  return (
    <main className="container max-w-2xl pb-20 pt-6">
      <Breadcrumbs trail={[{ label: 'Account', href: '/account' }, { label: 'Orders' }]} />
      <h1 className="large-title mb-6">Orders</h1>
      {orders.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 py-12 text-center">
          <Package className="size-10 text-muted-foreground/50" aria-hidden />
          <p className="text-[17px] text-muted-foreground">You have no orders yet.</p>
          <Link href="/search" className="btn-tinted btn-sm">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="grouped">
          {orders.map((o) => (
            <li key={o.orderNumber}>
              <Link
                href={`/account/orders/${o.orderNumber}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-black/[0.03]"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[17px] font-semibold">{o.orderNumber}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString()}
                    <StatusPill value={o.status} />
                    <StatusPill value={o.paymentStatus} />
                  </div>
                </div>
                <span className="text-[17px] font-semibold">{formatGHS(o.total)}</span>
                <ChevronRight className="size-5 text-muted-foreground/50" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import { formatGHS, STAFF_FULFILMENT_FLOW, type OrderStatus } from '@extramile/core';
import { Check, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusPill } from '@/components/account/status-pill';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { getUserOrder } from '@/lib/orders/queries';

export const metadata: Metadata = { title: 'Order' };
export const dynamic = 'force-dynamic';

function Timeline({ status }: { status: string }) {
  const steps = STAFF_FULFILMENT_FLOW;
  const currentIdx = steps.indexOf(status as OrderStatus);
  const cancelled = status === 'cancelled' || status === 'refunded' || status === 'oversold';
  if (cancelled) {
    return (
      <div className="panel flex items-center gap-3">
        <StatusPill value={status} />
        <p className="text-[15px] text-muted-foreground">This order is no longer in progress.</p>
      </div>
    );
  }
  return (
    <ol className="panel flex items-start">
      {steps.map((step, i) => {
        const done = currentIdx >= i;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {i > 0 && (
              <span
                className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${
                  done ? 'bg-primary' : 'bg-black/[0.08]'
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative flex size-7 items-center justify-center rounded-full text-white ${
                done ? 'bg-primary' : 'bg-black/[0.12]'
              }`}
            >
              {done ? <Check className="size-4" aria-hidden /> : null}
            </span>
            <span
              className={`text-[12px] font-medium capitalize ${done ? '' : 'text-muted-foreground'}`}
            >
              {step.replace(/_/g, ' ')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getUserOrder(orderNumber);
  if (!order) notFound();

  return (
    <main className="container max-w-2xl space-y-6 pb-20 pt-6">
      <div>
        <Breadcrumbs
          trail={[
            { label: 'Account', href: '/account' },
            { label: 'Orders', href: '/account/orders' },
            { label: order.orderNumber },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              Placed {new Date(order.createdAt).toLocaleString()}
              <StatusPill value={order.paymentStatus} />
            </p>
          </div>
          <Link href={`/account/orders/${order.orderNumber}/invoice`} className="btn-tinted btn-sm">
            <FileText className="size-4" aria-hidden /> Invoice
          </Link>
        </div>
      </div>

      <Timeline status={order.status} />

      <ul className="grouped">
        {order.items.map((item) => (
          <li key={item.sku} className="flex justify-between gap-4 px-4 py-3.5">
            <div className="space-y-0.5">
              <p className="text-[15px] font-semibold">
                {item.title} <span className="text-muted-foreground">× {item.qty}</span>
              </p>
              <p className="text-[13px] text-muted-foreground">
                SKU {item.sku}
                {item.warrantyMonths > 0 && ` · ${item.warrantyMonths}-mo warranty`}
              </p>
              {item.serials.length > 0 && (
                <p className="text-[13px] text-muted-foreground">
                  IMEI/Serial: {item.serials.join(', ')}
                </p>
              )}
            </div>
            <span className="text-[15px] font-medium">{formatGHS(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="panel space-y-2 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatGHS(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd>{order.shippingFee === 0 ? 'Free' : formatGHS(order.shippingFee)}</dd>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount</dt>
            <dd>−{formatGHS(order.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-black/[0.06] pt-3 text-[17px] font-bold">
          <dt>Total</dt>
          <dd>{formatGHS(order.total)}</dd>
        </div>
        {order.payment?.reference && (
          <p className="pt-1 text-[13px] text-muted-foreground">
            Paystack ref: {order.payment.reference}
          </p>
        )}
      </dl>
    </main>
  );
}

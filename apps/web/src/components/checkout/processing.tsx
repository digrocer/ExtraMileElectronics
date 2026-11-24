'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'polling' | 'paid' | 'failed' | 'timeout';

const MAX_ATTEMPTS = 45; // 45 × 2s ≈ 90s
const INTERVAL = 2000;

function State({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-4 px-6 py-12">
      {icon}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-[15px] text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  );
}

/** Polls order status — never trusts Paystack callback query params (docs/01 §4.5). */
export function ProcessingPoller({ orderNumber }: { orderNumber: string }) {
  const [phase, setPhase] = useState<Phase>('polling');
  const attempts = useRef(0);

  const poll = useCallback(() => {
    let active = true;
    attempts.current = 0;
    setPhase('polling');

    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${orderNumber}/status`, { cache: 'no-store' });
        const d = (await res.json()) as { paymentStatus?: string; status?: string };
        if (!active) return;
        if (d.paymentStatus === 'paid') return setPhase('paid');
        if (d.paymentStatus === 'failed' || d.status === 'cancelled') return setPhase('failed');
      } catch {
        // transient — keep polling
      }
      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) return setPhase('timeout');
      if (active) setTimeout(tick, INTERVAL);
    };
    void tick();
    return () => {
      active = false;
    };
  }, [orderNumber]);

  useEffect(() => poll(), [poll]);

  if (phase === 'paid') {
    return (
      <State
        icon={<CheckCircle2 className="size-16 text-success" aria-hidden />}
        title="Payment confirmed"
        body={<>Order {orderNumber} is confirmed. We&apos;ve emailed your receipt.</>}
      >
        <Link href={`/account/orders/${orderNumber}`} className="btn-primary">
          View your order
        </Link>
      </State>
    );
  }

  if (phase === 'failed') {
    return (
      <State
        icon={<XCircle className="size-16 text-destructive" aria-hidden />}
        title="Payment didn’t go through"
        body="Your bag is intact — you can try again."
      >
        <Link href="/checkout" className="btn-primary">
          Try again
        </Link>
      </State>
    );
  }

  if (phase === 'timeout') {
    return (
      <State
        icon={<Clock className="size-16 text-[#FF9500]" aria-hidden />}
        title="Still confirming…"
        body="This is taking longer than usual. If you completed payment, it will confirm shortly."
      >
        <button type="button" className="btn-tinted" onClick={poll}>
          Check again
        </button>
      </State>
    );
  }

  return (
    <State
      icon={
        <div className="size-14 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" />
      }
      title="Confirming your payment…"
      body={<>Order {orderNumber}. Please keep this page open — this only takes a moment.</>}
    />
  );
}

import { formatGHS } from '@extramile/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDashboardStats } from '@/lib/admin/queries';
import { requireStaff } from '@/lib/admin/guard';

export const metadata: Metadata = { title: 'Admin' };
export const dynamic = 'force-dynamic';

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/**
 * Read-only ops dashboard (docs/07-DESKTOP-ADMIN.md §2 — full CRUD lives in the
 * desktop app). Guarded by middleware AND this server-side staff check.
 */
export default async function AdminDashboardPage() {
  await requireStaff();
  const stats = await getDashboardStats();

  return (
    <main className="container space-y-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ops dashboard</h1>
        <Link href="/admin/orders" className="text-sm underline">
          Order queue →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders today" value={String(stats.todaysOrders)} href="/admin/orders" />
        <Stat label="Revenue today" value={formatGHS(stats.todaysRevenue)} />
        <Stat
          label="Pending payments"
          value={String(stats.pendingPayments)}
          href="/admin/orders?status=pending"
        />
        <Stat
          label="Oversold"
          value={String(stats.oversold)}
          href="/admin/orders?status=oversold"
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Low stock (&lt; 3)</h2>
        {stats.lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing low right now.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {stats.lowStock.map((v) => (
              <li key={v.sku} className="flex justify-between p-3">
                <span>{v.sku}</span>
                <span className={v.available <= 0 ? 'text-destructive' : 'text-[#C26A00]'}>
                  {v.available} left
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Full catalogue, inventory and CSV tools live in the desktop back-office app.
      </p>
    </main>
  );
}

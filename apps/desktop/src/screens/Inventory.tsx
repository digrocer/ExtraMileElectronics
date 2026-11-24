import { formatGHS } from '@extramile/core';
import { useEffect, useMemo, useState } from 'react';
import {
  listRecentMovements,
  listVariantStock,
  summarise,
  type Movement,
  type VariantStock,
} from '../lib/inventory';

const LOW_STOCK_THRESHOLD = 3;

export function Inventory() {
  const [rows, setRows] = useState<VariantStock[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [stock, moves] = await Promise.all([listVariantStock(), listRecentMovements()]);
      setRows(stock);
      setMovements(moves);
      setLoading(false);
    })();
  }, []);

  const summary = useMemo(() => summarise(rows), [rows]);
  const low = useMemo(() => rows.filter((v) => v.available < LOW_STOCK_THRESHOLD), [rows]);

  if (loading) {
    return (
      <main style={{ padding: '1.5rem' }}>
        <p className="muted">Loading inventory…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem', maxWidth: '60rem' }}>
      <h1 style={{ margin: 0 }}>Inventory</h1>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }}>
        <StatCard label="Active SKUs" value={String(summary.skuCount)} />
        <StatCard label="Units on hand" value={String(summary.totalUnits)} />
        <StatCard label="Retail value" value={formatGHS(summary.retailValue)} />
      </section>

      <section style={{ display: 'grid', gap: '.4rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
          Low stock (available &lt; {LOW_STOCK_THRESHOLD}) — {low.length}
        </h2>
        {low.length === 0 ? (
          <p className="muted">Nothing low right now.</p>
        ) : (
          <Table
            head={['SKU', 'Product', 'On hand', 'Reserved', 'Available']}
            rows={low.map((v) => [
              v.sku,
              v.title,
              String(v.stock),
              String(v.reserved),
              String(v.available),
            ])}
          />
        )}
      </section>

      <section style={{ display: 'grid', gap: '.4rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Recent movements</h2>
        {movements.length === 0 ? (
          <p className="muted">No stock movements yet.</p>
        ) : (
          <Table
            head={['When', 'SKU', 'Δ', 'Reason']}
            rows={movements.map((m) => [
              new Date(m.created_at).toLocaleString(),
              m.sku ?? '—',
              (m.delta > 0 ? '+' : '') + m.delta,
              m.reason,
            ])}
          />
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{ border: '1px solid hsl(var(--border))', borderRadius: '.5rem', padding: '.75rem' }}
    >
      <p className="muted" style={{ margin: 0, textTransform: 'uppercase', fontSize: '.7rem' }}>
        {label}
      </p>
      <p style={{ margin: '.25rem 0 0', fontSize: '1.4rem', fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '.4rem .5rem',
                  borderBottom: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--muted-foreground))',
                  fontWeight: 600,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td
                  key={j}
                  style={{ padding: '.4rem .5rem', borderBottom: '1px solid hsl(var(--border))' }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

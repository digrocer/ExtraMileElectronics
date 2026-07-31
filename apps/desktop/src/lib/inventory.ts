import { supabase } from './supabase';

// Read-only inventory reporting. All reads are authorised by RLS for staff
// (staff_var / staff_inv). Available stock is on-hand minus reserved.

export interface VariantStock {
  id: string;
  sku: string;
  title: string;
  stock: number;
  reserved: number;
  available: number;
  price: number; // pesewas
}

export interface Movement {
  id: number;
  sku: string | null;
  delta: number;
  reason: string;
  created_at: string;
}

interface VariantJoin {
  id: string;
  sku: string;
  stock: number;
  reserved: number;
  price: number;
  products: { title: string } | null;
}

/** All active variants with their product title and computed availability. */
export async function listVariantStock(): Promise<VariantStock[]> {
  const { data } = await supabase
    .from('product_variants')
    .select('id, sku, stock, reserved, price, products(title)')
    .eq('is_active', true)
    .returns<VariantJoin[]>();
  return (data ?? [])
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.products?.title ?? '—',
      stock: v.stock,
      reserved: v.reserved,
      available: v.stock - v.reserved,
      price: v.price,
    }))
    .sort((a, b) => a.available - b.available);
}

interface MovementJoin {
  id: number;
  delta: number;
  reason: string;
  created_at: string;
  product_variants: { sku: string } | null;
}

export async function listRecentMovements(limit = 50): Promise<Movement[]> {
  const { data } = await supabase
    .from('inventory_movements')
    .select('id, delta, reason, created_at, product_variants(sku)')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<MovementJoin[]>();
  return (data ?? []).map((m) => ({
    id: m.id,
    sku: m.product_variants?.sku ?? null,
    delta: m.delta,
    reason: m.reason,
    created_at: m.created_at,
  }));
}

export interface StockSummary {
  skuCount: number;
  totalUnits: number;
  retailValue: number; // pesewas: Σ stock × price
}

export function summarise(rows: VariantStock[]): StockSummary {
  return rows.reduce<StockSummary>(
    (acc, v) => ({
      skuCount: acc.skuCount + 1,
      totalUnits: acc.totalUnits + v.stock,
      retailValue: acc.retailValue + v.stock * v.price,
    }),
    { skuCount: 0, totalUnits: 0, retailValue: 0 },
  );
}

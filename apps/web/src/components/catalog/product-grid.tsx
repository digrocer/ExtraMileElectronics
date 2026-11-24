import type { ProductListItem } from '@/lib/catalog/queries';
import { ProductCard } from './product-card';

export function ProductGrid({ items }: { items: ProductListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-card py-16 text-center">
        <p className="text-muted-foreground">No products match your filters.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

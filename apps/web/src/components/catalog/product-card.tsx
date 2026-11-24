import Image from 'next/image';
import Link from 'next/link';
import type { ProductListItem } from '@/lib/catalog/queries';
import { tintFor } from '@/lib/catalog/tint';
import { Price } from './price';

export function ProductCard({ product }: { product: ProductListItem }) {
  const onSale = product.compareAtPrice != null && product.compareAtPrice > (product.minPrice ?? 0);
  return (
    <Link
      href={`/p/${product.slug}`}
      className="pressable group block rounded-2xl bg-card p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_18px_40px_-16px_rgba(0,0,0,0.22)]"
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br ${tintFor(product.slug)}`}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized={product.imageUrl.endsWith('.svg')}
            className="object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {!product.inStock && (
            <span className="rounded-md bg-card px-2 py-0.5 text-[11px] font-semibold text-destructive">
              Sold out
            </span>
          )}
          {product.inStock && onSale && (
            <span className="rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background">
              Sale
            </span>
          )}
        </div>
      </div>
      <div className="space-y-0.5 px-2 pb-2 pt-3">
        {product.brand && (
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand.name}
          </p>
        )}
        <h3 className="line-clamp-1 text-[15px] font-semibold">{product.title}</h3>
        <Price amount={product.minPrice} compareAt={product.compareAtPrice} className="text-sm" />
      </div>
    </Link>
  );
}

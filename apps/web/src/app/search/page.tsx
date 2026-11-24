import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Facets } from '@/components/catalog/facets';
import { Pager } from '@/components/catalog/pager';
import { ProductGrid } from '@/components/catalog/product-grid';
import { SortSelect } from '@/components/catalog/sort-select';
import { demoBrands, demoCatalogEnabled, demoListProducts } from '@/lib/catalog/demo';
import { getActiveBrands, listProducts, type Condition } from '@/lib/catalog/queries';
import { buildPageHref, flattenParams, parseSort, type RawSearchParams } from '@/lib/catalog/url';

export const metadata: Metadata = { title: 'Search' };

const SUGGESTIONS = ['iPhone', 'Galaxy', 'MacBook', 'AirPods', 'Bravia', 'SSD'];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = flattenParams(await searchParams);
  const q = (sp.q ?? '').trim();
  const dbBrands = await getActiveBrands().catch(() => []);
  // No brands means the catalogue schema/seed isn't there yet — use the dev demo rows.
  const demo = demoCatalogEnabled && dbBrands.length === 0;
  const brands = demo ? demoBrands : dbBrands;
  const brandId = sp.brand ? brands.find((b) => b.slug === sp.brand)?.id : undefined;
  const sort = parseSort(sp.sort);
  const page = Number.parseInt(sp.page ?? '1', 10) || 1;
  const pathname = '/search';

  const run = demo
    ? async (p: Parameters<typeof listProducts>[0]) => demoListProducts(p)
    : listProducts;
  const result = q
    ? await run({
        q,
        brandId,
        condition: sp.condition as Condition | undefined,
        inStock: sp.in_stock === '1',
        sort,
        page,
      })
    : { items: [], page: 1, pageSize: 24, hasMore: false };
  const popular = q ? null : await run({ sort: 'rating', pageSize: 8 }).catch(() => null);

  return (
    <main className="container pb-20 pt-6">
      <h1 className="mb-4 text-3xl font-semibold">Search</h1>
      <form action="/search" method="get" className="mb-4">
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-black/[0.06] px-4 text-muted-foreground transition-shadow focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/20">
          <Search className="size-[18px] shrink-0" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Phones, laptops, TVs…"
            aria-label="Search products"
            autoFocus={!q}
            className="h-full w-full bg-transparent text-[17px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
      </form>

      {!q ? (
        <div className="space-y-10">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="pressable inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[15px] font-medium text-primary shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              >
                <Search className="size-3.5" aria-hidden /> {s}
              </Link>
            ))}
          </div>
          {popular && popular.items.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Popular right now</h2>
              <ProductGrid items={popular.items} />
            </section>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[260px_1fr] md:gap-8">
          <Facets pathname={pathname} current={sp} brands={brands} />
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-muted-foreground">
                {result.items.length} {result.items.length === 1 ? 'result' : 'results'} for{' '}
                <span className="font-semibold text-foreground">“{q}”</span>
              </p>
              <SortSelect value={sort} />
            </div>
            <ProductGrid items={result.items} />
            <Pager
              prevHref={page > 1 ? buildPageHref(pathname, sp, page - 1) : undefined}
              nextHref={result.hasMore ? buildPageHref(pathname, sp, page + 1) : undefined}
            />
          </div>
        </div>
      )}
    </main>
  );
}

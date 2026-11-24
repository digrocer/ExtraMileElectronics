import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { Facets } from '@/components/catalog/facets';
import { Pager } from '@/components/catalog/pager';
import { ProductGrid } from '@/components/catalog/product-grid';
import { SortSelect } from '@/components/catalog/sort-select';
import {
  demoBrands,
  demoCatalogEnabled,
  demoCategoryBySlug,
  demoListProducts,
  isDemoId,
} from '@/lib/catalog/demo';
import {
  getActiveBrands,
  getCategoryBySlug,
  listProducts,
  type Condition,
} from '@/lib/catalog/queries';
import { buildPageHref, flattenParams, parseSort, type RawSearchParams } from '@/lib/catalog/url';

export const revalidate = 300;

function lastSlug(slug: string[]): string {
  return slug[slug.length - 1] ?? '';
}

async function loadCategory(slug: string) {
  const category = await getCategoryBySlug(slug).catch(() => null);
  if (category || !demoCatalogEnabled) return category;
  return demoCategoryBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(lastSlug(slug));
  if (!category) return { title: 'Not found' };
  return { title: category.name, description: `Shop ${category.name} at ExtraMile Electronics.` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const sp = flattenParams(await searchParams);
  const category = await loadCategory(lastSlug(slug));
  if (!category) notFound();
  const demo = isDemoId(category.id);

  const brands = demo ? demoBrands : await getActiveBrands();
  const brandId = sp.brand ? brands.find((b) => b.slug === sp.brand)?.id : undefined;
  const sort = parseSort(sp.sort);
  const page = Number.parseInt(sp.page ?? '1', 10) || 1;
  const pathname = `/c/${slug.join('/')}`;

  const query = {
    categoryId: category.id,
    brandId,
    condition: sp.condition as Condition | undefined,
    inStock: sp.in_stock === '1',
    sort,
    page,
  };
  const result = demo ? demoListProducts(query) : await listProducts(query);

  return (
    <main className="container pb-20 pt-6">
      <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: category.name }]} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{category.name}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {result.items.length} {result.items.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        <SortSelect value={sort} />
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr] md:gap-8">
        <Facets pathname={pathname} current={sp} brands={brands} />

        <div className="space-y-6">
          <ProductGrid items={result.items} />
          <Pager
            prevHref={page > 1 ? buildPageHref(pathname, sp, page - 1) : undefined}
            nextHref={result.hasMore ? buildPageHref(pathname, sp, page + 1) : undefined}
          />
        </div>
      </div>
    </main>
  );
}

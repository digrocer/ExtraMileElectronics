import { pesewasToCedis } from '@extramile/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { ProductGrid } from '@/components/catalog/product-grid';
import { SpecTable } from '@/components/catalog/spec-table';
import { VariantSelector } from '@/components/catalog/variant-selector';
import {
  demoCatalogEnabled,
  demoListProducts,
  demoProductDetail,
  isDemoId,
} from '@/lib/catalog/demo';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalog/queries';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 300;

async function loadProduct(slug: string) {
  const product = await getProductBySlug(slug).catch(() => null);
  if (product || !demoCatalogEnabled) return product;
  return demoProductDetail(slug);
}

/** Prerender active product pages at build; unknown slugs still render on-demand. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true)
      .returns<{ slug: string }[]>();
    return (data ?? []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: 'Not found' };
  const image = product.images.find((i) => i.url)?.url ?? undefined;
  return {
    title: product.title,
    description: product.description ?? `${product.title} — genuine, warrantied, in Accra.`,
    openGraph: { title: product.title, images: image ? [image] : [] },
    alternates: { canonical: `/p/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const related = !product.category
    ? []
    : isDemoId(product.id)
      ? demoListProducts({ categoryId: product.category.id, sort: 'rating' })
          .items.filter((p) => p.id !== product.id)
          .slice(0, 4)
      : await getRelatedProducts(product.category.id, product.id);

  const prices = product.variants.map((v) => v.price);
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const anyInStock = product.variants.some((v) => v.available > 0);
  const image = product.images.find((i) => i.url)?.url;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    sku: product.variants[0]?.sku,
    image: image ? [image] : undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'GHS',
      lowPrice: pesewasToCedis(low),
      highPrice: pesewasToCedis(high),
      offerCount: product.variants.length,
      availability: anyInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      ...(product.category
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: product.category.name,
              item: `/c/${product.category.slug}`,
            },
          ]
        : []),
      { '@type': 'ListItem', position: product.category ? 3 : 2, name: product.title },
    ],
  };

  return (
    <main className="container pb-20 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          ...(product.category
            ? [{ label: product.category.name, href: `/c/${product.category.slug}` }]
            : []),
          { label: product.title },
        ]}
      />

      <Suspense fallback={<div className="aspect-square animate-pulse rounded-2xl bg-muted" />}>
        <VariantSelector product={product} />
      </Suspense>

      <div className="mt-14 grid gap-8 md:grid-cols-2 md:gap-12">
        {product.description && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="whitespace-pre-line text-[17px] leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Tech specs</h2>
          <SpecTable specs={product.specs} schema={product.category?.specSchema ?? {}} />
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-16 space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">You might also like</h2>
            {product.category && (
              <Link
                href={`/c/${product.category.slug}`}
                className="text-[15px] font-medium text-primary"
              >
                See all
              </Link>
            )}
          </div>
          <ProductGrid items={related} />
        </section>
      )}
    </main>
  );
}

import {
  Cable,
  ChevronRight,
  Headphones,
  Laptop,
  type LucideIcon,
  Package,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
  Tv,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { ProductGrid } from '@/components/catalog/product-grid';
import { demoCatalogEnabled, demoCategories, demoProducts } from '@/lib/catalog/demo';
import { getCategoryTree, listProducts } from '@/lib/catalog/queries';

export const revalidate = 300;

// Line icon per top-level category.
const categoryIcons: Record<string, LucideIcon> = {
  smartphones: Smartphone,
  laptops: Laptop,
  televisions: Tv,
  audio: Headphones,
  accessories: Cable,
};

const promises = [
  { icon: ShieldCheck, title: 'Real warranties', body: 'Every serial on record' },
  { icon: Wallet, title: 'MoMo or card', body: 'Pay securely via Paystack' },
  { icon: Truck, title: 'Accra delivery', body: 'Next day in most areas' },
];

export default async function HomePage() {
  // Degrade gracefully if the DB is unreachable at build/render time.
  const [dbCategories, featured] = await Promise.all([
    getCategoryTree().catch(() => []),
    listProducts({ sort: 'rating', pageSize: 8 }).catch(() => ({
      items: [],
      page: 1,
      pageSize: 8,
      hasMore: false,
    })),
  ]);

  const categories = dbCategories.length || !demoCatalogEnabled ? dbCategories : demoCategories;
  const products =
    featured.items.length || !demoCatalogEnabled ? featured.items : demoProducts.slice(0, 8);

  return (
    <main className="container space-y-12 pb-20 pt-6 sm:space-y-16 sm:pt-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-card px-6 py-14 text-center sm:px-12 sm:py-20">
        <div className="relative mx-auto max-w-2xl space-y-6">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" /> Accra · Ghana
          </p>
          <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
            Genuine electronics.
            <br />
            <span className="text-muted-foreground">Real warranties.</span>
          </h1>
          <p className="mx-auto max-w-md text-balance text-[17px] leading-relaxed text-muted-foreground">
            Phones, laptops, TVs and audio with true stock and warranty records. No DMs, no
            guesswork.
          </p>
          <form action="/search" method="get" className="mx-auto max-w-md">
            <label className="flex h-12 items-center gap-2 rounded-2xl bg-secondary px-4 text-muted-foreground transition-shadow focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/20">
              <Search className="size-[18px] shrink-0" aria-hidden />
              <input
                type="search"
                name="q"
                placeholder="Search iPhone, MacBook, Bravia…"
                aria-label="Search products"
                className="h-full w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </label>
          </form>
        </div>
      </section>

      {/* Promises — grouped like an iOS settings list */}
      <section className="grid gap-3 sm:grid-cols-3">
        {promises.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl bg-card p-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-foreground/70">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-semibold">{title}</p>
              <p className="text-[13px] text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Browse</h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
            {categories.map((c) => {
              const Icon = categoryIcons[c.slug] ?? Package;
              return (
                <Link
                  key={c.id}
                  href={`/c/${c.slug}`}
                  className="pressable flex min-w-[7.5rem] snap-start flex-col items-center gap-3 rounded-2xl bg-card px-4 py-5 transition-shadow hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.3)]"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground/70">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className="text-[13px] font-semibold">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured */}
      {products.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">Top rated</h2>
            <Link
              href="/search"
              className="inline-flex items-center text-[15px] font-medium text-primary"
            >
              See all <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ProductGrid items={products} />
        </section>
      )}
    </main>
  );
}

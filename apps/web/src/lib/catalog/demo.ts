import type {
  Brand,
  CategoryNode,
  ListParams,
  ListResult,
  ProductDetail,
  ProductListItem,
} from './queries';

/**
 * Dev-only stand-in catalogue so the storefront can be designed before the
 * Supabase project has the catalogue schema + seed applied. Mirrors a slice of
 * supabase/migrations/20260730120000_seed_catalogue.sql; illustrations live in
 * public/demo. On in development; elsewhere only when the server-only
 * DEMO_CATALOG=1 is set (design previews). Never set it on production.
 */
export const demoCatalogEnabled =
  process.env.NODE_ENV === 'development' || process.env.DEMO_CATALOG === '1';

/** Demo ids can't be bought — the cart/checkout path needs real variants. */
export function isDemoId(id: string): boolean {
  return id.startsWith('demo-');
}

const specSchemas: Record<string, Record<string, unknown>> = {
  smartphones: {
    display_in: {},
    chipset: {},
    ram_gb: {},
    storage_gb: {},
    battery_mah: {},
    rear_cam_mp: {},
    os: {},
  },
  laptops: { cpu: {}, ram_gb: {}, storage_gb: {}, display_in: {}, gpu: {}, os: {} },
  televisions: { size_in: {}, panel: {}, resolution: {}, smart_os: {}, hdr: {} },
  audio: { type: {}, connectivity: {}, anc: {}, battery_hours: {} },
  accessories: { type: {}, compatibility: {} },
};

const categoryNames: Record<string, string> = {
  smartphones: 'Smartphones',
  laptops: 'Laptops',
  televisions: 'Televisions',
  audio: 'Audio',
  accessories: 'Accessories',
};

interface DemoProduct {
  slug: string;
  title: string;
  brand: string;
  category: keyof typeof categoryNames;
  image: string;
  rating: number;
  ratingCount: number;
  warranty: [months: number, provider: string];
  description: string;
  specs: Record<string, unknown>;
  /** [sku, attrs, price (pesewas), compareAt, stock] */
  variants: [string, Record<string, string>, number, number | null, number][];
}

const products: DemoProduct[] = [
  {
    slug: 'iphone-15-pro',
    title: 'iPhone 15 Pro',
    brand: 'Apple',
    category: 'smartphones',
    image: 'phone',
    rating: 4.9,
    ratingCount: 30,
    warranty: [12, 'Apple Ghana'],
    description: 'Titanium design, A17 Pro, and a pro camera system.',
    specs: {
      display_in: 6.1,
      chipset: 'A17 Pro',
      ram_gb: 8,
      storage_gb: 256,
      battery_mah: 3274,
      rear_cam_mp: 48,
      os: 'iOS 17',
    },
    variants: [
      ['APL-IP15P-256-TIT', { color: 'Natural Titanium', storage: '256GB' }, 1549900, null, 5],
      ['APL-IP15P-512-TIT', { color: 'Natural Titanium', storage: '512GB' }, 1849900, null, 3],
    ],
  },
  {
    slug: 'galaxy-s24',
    title: 'Galaxy S24',
    brand: 'Samsung',
    category: 'smartphones',
    image: 'phone-alt',
    rating: 4.7,
    ratingCount: 51,
    warranty: [24, 'Samsung Ghana'],
    description: 'Compact flagship with Galaxy AI.',
    specs: {
      display_in: 6.2,
      chipset: 'Snapdragon 8 Gen 3',
      ram_gb: 8,
      storage_gb: 256,
      battery_mah: 4000,
      rear_cam_mp: 50,
      os: 'Android 14',
    },
    variants: [
      ['SAM-S24-256-BLK', { color: 'Onyx Black', storage: '256GB' }, 1099900, 1199900, 10],
      ['SAM-S24-256-VIO', { color: 'Cobalt Violet', storage: '256GB' }, 1099900, 1199900, 7],
    ],
  },
  {
    slug: 'macbook-air-13-m3',
    title: 'MacBook Air 13 (M3)',
    brand: 'Apple',
    category: 'laptops',
    image: 'laptop',
    rating: 4.9,
    ratingCount: 35,
    warranty: [12, 'Apple Ghana'],
    description: 'Fanless, all-day battery, M3 speed.',
    specs: {
      cpu: 'Apple M3',
      ram_gb: 8,
      storage_gb: 256,
      display_in: 13.6,
      gpu: '8-core GPU',
      os: 'macOS Sonoma',
    },
    variants: [
      ['APL-MBA13M3-256-MID', { color: 'Midnight', config: '8GB/256GB' }, 1499900, 1599900, 7],
      ['APL-MBA13M3-512-STL', { color: 'Starlight', config: '16GB/512GB' }, 1899900, null, 4],
    ],
  },
  {
    slug: 'sony-wh-1000xm5',
    title: 'WH-1000XM5',
    brand: 'Sony',
    category: 'audio',
    image: 'headphones',
    rating: 4.8,
    ratingCount: 64,
    warranty: [12, 'Sony Ghana'],
    description: 'Class-leading noise cancelling over-ears.',
    specs: { type: 'Over-ear', connectivity: 'Bluetooth 5.2', anc: true, battery_hours: 30 },
    variants: [
      ['SON-WH1000XM5-BLK', { color: 'Black' }, 379900, 429900, 18],
      ['SON-WH1000XM5-SLV', { color: 'Silver' }, 379900, 429900, 10],
    ],
  },
  {
    slug: 'sony-55-bravia-oled',
    title: '55" Bravia OLED',
    brand: 'Sony',
    category: 'televisions',
    image: 'tv',
    rating: 4.8,
    ratingCount: 15,
    warranty: [24, 'Sony Ghana'],
    description: 'Self-lit OLED pixels, cinematic contrast.',
    specs: { size_in: 55, panel: 'OLED', resolution: '4K UHD', smart_os: 'Google TV', hdr: true },
    variants: [['SON-TV55-A80L', { size: '55 inch' }, 1599900, 1799900, 3]],
  },
  {
    slug: 'airpods-pro-2',
    title: 'AirPods Pro 2 (USB-C)',
    brand: 'Apple',
    category: 'audio',
    image: 'earbuds',
    rating: 4.8,
    ratingCount: 73,
    warranty: [12, 'Apple Ghana'],
    description: 'Adaptive audio and USB-C charging.',
    specs: { type: 'In-ear', connectivity: 'Bluetooth 5.3', anc: true, battery_hours: 6 },
    variants: [['APL-APP2-USBC', { color: 'White' }, 259900, 289900, 22]],
  },
  {
    slug: 'galaxy-z-flip6',
    title: 'Galaxy Z Flip6',
    brand: 'Samsung',
    category: 'smartphones',
    image: 'foldable',
    rating: 4.6,
    ratingCount: 19,
    warranty: [24, 'Samsung Ghana'],
    description: 'Foldable flagship, pocketable design.',
    specs: {
      display_in: 6.7,
      chipset: 'Snapdragon 8 Gen 3',
      ram_gb: 12,
      storage_gb: 256,
      battery_mah: 4000,
      rear_cam_mp: 50,
      os: 'Android 14',
    },
    variants: [['SAM-ZFLIP6-256-BLU', { color: 'Blue', storage: '256GB' }, 1399900, null, 4]],
  },
  {
    slug: 'dell-xps-13',
    title: 'XPS 13',
    brand: 'Dell',
    category: 'laptops',
    image: 'laptop',
    rating: 4.7,
    ratingCount: 18,
    warranty: [12, 'Dell Ghana'],
    description: 'Compact, machined-aluminium ultrabook.',
    specs: {
      cpu: 'Intel Core Ultra 7 155H',
      ram_gb: 16,
      storage_gb: 512,
      display_in: 13.4,
      gpu: 'Intel Arc',
      os: 'Windows 11',
    },
    variants: [['DEL-XPS13-512', { config: 'Ultra7/16GB/512GB' }, 1699900, null, 4]],
  },
  {
    slug: 'pixel-8',
    title: 'Pixel 8',
    brand: 'Google',
    category: 'smartphones',
    image: 'phone-alt',
    rating: 4.6,
    ratingCount: 24,
    warranty: [12, 'Google'],
    description: 'Google Tensor G3 with 7 years of updates.',
    specs: {
      display_in: 6.2,
      chipset: 'Tensor G3',
      ram_gb: 8,
      storage_gb: 128,
      battery_mah: 4575,
      rear_cam_mp: 50,
      os: 'Android 14',
    },
    variants: [
      ['GOO-PX8-128-OBS', { color: 'Obsidian', storage: '128GB' }, 899900, 999900, 9],
      ['GOO-PX8-256-HAZ', { color: 'Hazel', storage: '256GB' }, 999900, null, 4],
    ],
  },
  {
    slug: 'samsung-65-qled',
    title: '65" QLED 4K',
    brand: 'Samsung',
    category: 'televisions',
    image: 'tv',
    rating: 4.7,
    ratingCount: 22,
    warranty: [24, 'Samsung Ghana'],
    description: 'Big-screen QLED for the living room.',
    specs: { size_in: 65, panel: 'QLED', resolution: '4K UHD', smart_os: 'Tizen', hdr: true },
    variants: [['SAM-TV65-Q70C', { size: '65 inch' }, 1099900, 1249900, 4]],
  },
  {
    slug: 'samsung-t7-ssd-1tb',
    title: 'T7 Portable SSD 1TB',
    brand: 'Samsung',
    category: 'accessories',
    image: 'ssd',
    rating: 4.7,
    ratingCount: 45,
    warranty: [36, 'Samsung Ghana'],
    description: 'Pocket SSD with fast USB 3.2.',
    specs: { type: 'Storage', compatibility: 'USB-C laptops & phones' },
    variants: [['SAM-T7-1TB', {}, 89900, 109900, 25]],
  },
  {
    slug: 'apple-20w-usb-c-adapter',
    title: '20W USB-C Power Adapter',
    brand: 'Apple',
    category: 'accessories',
    image: 'charger',
    rating: 4.5,
    ratingCount: 51,
    warranty: [12, 'Apple Ghana'],
    description: 'Fast, compact charging brick.',
    specs: { type: 'Charger', compatibility: 'iPhone, iPad' },
    variants: [['APL-20W-USBC', {}, 29900, null, 60]],
  },
];

function brandOf(name: string): Brand {
  return { id: `demo-${name.toLowerCase()}`, name, slug: name.toLowerCase() };
}

function toListItem(p: DemoProduct): ProductListItem {
  const cheapest = [...p.variants].sort((a, b) => a[2] - b[2])[0];
  return {
    id: `demo-${p.slug}`,
    title: p.title,
    slug: p.slug,
    condition: 'new',
    ratingAvg: p.rating,
    ratingCount: p.ratingCount,
    brand: brandOf(p.brand),
    minPrice: cheapest?.[2] ?? null,
    compareAtPrice: cheapest?.[3] ?? null,
    imageUrl: `/demo/${p.image}.svg`,
    imageAlt: p.title,
    inStock: p.variants.some((v) => v[4] > 0),
  };
}

export const demoProducts: ProductListItem[] = products.map(toListItem);

export const demoCategories: CategoryNode[] = Object.entries(categoryNames).map(([slug, name]) => ({
  id: `demo-${slug}`,
  name,
  slug,
  parentId: null,
  children: [],
}));

export const demoBrands: Brand[] = [...new Set(products.map((p) => p.brand))].sort().map(brandOf);

export function demoCategoryBySlug(
  slug: string,
): { id: string; name: string; slug: string } | null {
  const name = categoryNames[slug];
  return name ? { id: `demo-${slug}`, name, slug } : null;
}

/** In-memory version of listProducts over the demo rows. */
export function demoListProducts(params: ListParams): ListResult {
  const q = (params.q ?? '').trim().toLowerCase();
  const items = products
    .filter(
      (p) =>
        (!params.categoryId || `demo-${p.category}` === params.categoryId) &&
        (!params.brandId || brandOf(p.brand).id === params.brandId) &&
        (!params.condition || params.condition === 'new') &&
        (!q || `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)),
    )
    .map(toListItem);
  const price = (i: ProductListItem) => i.minPrice ?? 0;
  if (params.sort === 'price_asc') items.sort((a, b) => price(a) - price(b));
  if (params.sort === 'price_desc') items.sort((a, b) => price(b) - price(a));
  if (params.sort === 'rating') items.sort((a, b) => b.ratingAvg - a.ratingAvg);
  const pageSize = params.pageSize ?? 24;
  return { items: items.slice(0, pageSize), page: 1, pageSize, hasMore: false };
}

export function demoProductDetail(slug: string): ProductDetail | null {
  const p = products.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    id: `demo-${p.slug}`,
    title: p.title,
    slug: p.slug,
    model: null,
    description: p.description,
    specs: p.specs,
    condition: 'new',
    warrantyMonths: p.warranty[0],
    warrantyProvider: p.warranty[1],
    ratingAvg: p.rating,
    ratingCount: p.ratingCount,
    category: {
      id: `demo-${p.category}`,
      name: categoryNames[p.category] ?? p.category,
      slug: p.category,
      specSchema: specSchemas[p.category] ?? {},
    },
    brand: brandOf(p.brand),
    variants: p.variants.map(([sku, attrs, price, compareAt, stock]) => ({
      id: `demo-${sku}`,
      sku,
      attrs,
      price,
      compareAtPrice: compareAt,
      available: stock,
    })),
    images: [{ url: `/demo/${p.image}.svg`, alt: p.title, variantId: null }],
  };
}

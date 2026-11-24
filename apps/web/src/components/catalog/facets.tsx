import { X } from 'lucide-react';
import Link from 'next/link';
import type { Brand, Condition } from '@/lib/catalog/queries';
import { buildFacetHref } from '@/lib/catalog/url';

const CONDITIONS: [Condition, string][] = [
  ['new', 'New'],
  ['open_box', 'Open box'],
  ['refurbished', 'Refurbished'],
];

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`pressable inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'bg-secondary text-foreground/80 hover:bg-black/[0.08]'
      }`}
    >
      {children}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Facets({
  pathname,
  current,
  brands,
}: {
  pathname: string;
  current: Record<string, string | undefined>;
  brands: Brand[];
}) {
  const hasFilters = Boolean(current.brand || current.condition || current.in_stock);

  return (
    <aside className="space-y-5 self-start rounded-2xl bg-card p-5 md:sticky md:top-20">
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold">Filters</p>
        {hasFilters && (
          <Link
            href={pathname}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary"
          >
            <X className="size-3.5" aria-hidden /> Clear
          </Link>
        )}
      </div>

      {brands.length > 0 && (
        <Group title="Brand">
          {brands.map((b) => {
            const active = current.brand === b.slug;
            return (
              <Chip
                key={b.id}
                active={active}
                href={buildFacetHref(pathname, current, { brand: active ? null : b.slug })}
              >
                {b.name}
              </Chip>
            );
          })}
        </Group>
      )}

      <Group title="Condition">
        {CONDITIONS.map(([value, label]) => {
          const active = current.condition === value;
          return (
            <Chip
              key={value}
              active={active}
              href={buildFacetHref(pathname, current, { condition: active ? null : value })}
            >
              {label}
            </Chip>
          );
        })}
      </Group>

      <Group title="Availability">
        <Chip
          active={current.in_stock === '1'}
          href={buildFacetHref(pathname, current, {
            in_stock: current.in_stock === '1' ? null : '1',
          })}
        >
          In stock only
        </Chip>
      </Group>
    </aside>
  );
}

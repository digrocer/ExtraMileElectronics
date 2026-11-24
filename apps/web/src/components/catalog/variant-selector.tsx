'use client';

import { formatGHS } from '@extramile/core';
import { Minus, Plus, ShieldCheck, Star, Truck, Wallet } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { addToCartAction } from '@/lib/cart/actions';
import { isDemoId } from '@/lib/catalog/demo';
import type { ProductDetail, VariantDetail } from '@/lib/catalog/queries';
import { tintFor } from '@/lib/catalog/tint';

function variantLabel(v: VariantDetail): string {
  const vals = Object.values(v.attrs)
    .filter((x) => x !== null && x !== undefined && x !== '')
    .map(String);
  return vals.length ? vals.join(' · ') : v.sku;
}

export function VariantSelector({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const initialSku = params.get('variant') ?? undefined;
  const initial = product.variants.find((v) => v.sku === initialSku) ?? product.variants[0];
  const [selectedId, setSelectedId] = useState(initial?.id);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startAdd] = useTransition();

  const selected = product.variants.find((v) => v.id === selectedId) ?? initial;

  const images = useMemo(() => {
    const isStr = (u: string | null): u is string => Boolean(u);
    const forVariant = product.images
      .filter((i) => i.variantId === selected?.id)
      .map((i) => i.url)
      .filter(isStr);
    const generic = product.images
      .filter((i) => !i.variantId)
      .map((i) => i.url)
      .filter(isStr);
    const all = product.images.map((i) => i.url).filter(isStr);
    return forVariant.length ? forVariant : generic.length ? generic : all;
  }, [product.images, selected?.id]);

  function select(v: VariantDetail) {
    setSelectedId(v.id);
    setActiveImage(0);
    setQty(1);
    setMessage(null);
    const next = new URLSearchParams(params.toString());
    next.set('variant', v.sku);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  if (!selected) {
    return <p className="text-muted-foreground">This product has no available variants.</p>;
  }
  const chosen = selected;

  function add() {
    setMessage(null);
    if (isDemoId(chosen.id)) {
      setMessage('Demo product — connect the catalogue database to enable checkout.');
      return;
    }
    startAdd(async () => {
      const res = await addToCartAction(chosen.id, qty);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      window.dispatchEvent(new Event('cart:changed'));
      setMessage(res.clamped ? `Added — only ${res.qty} available.` : 'Added to cart.');
      router.refresh();
    });
  }

  const onSale = chosen.compareAtPrice != null && chosen.compareAtPrice > chosen.price;
  const isSvg = (u: string) => u.endsWith('.svg');

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      {/* Gallery */}
      <div className="space-y-3 md:sticky md:top-20 md:self-start">
        <div
          className={`relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br ${tintFor(product.slug)}`}
        >
          {images[activeImage] ? (
            <Image
              src={images[activeImage]}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized={isSvg(images[activeImage])}
              className="object-contain p-8 sm:p-12"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`pressable relative size-16 shrink-0 overflow-hidden rounded-xl bg-card ${
                  i === activeImage ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                }`}
                aria-label={`Image ${i + 1}`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="64px"
                  unoptimized={isSvg(url)}
                  className="object-contain p-1.5"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selection */}
      <div className="space-y-6">
        <div className="space-y-2">
          {product.brand && (
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              {product.brand.name}
            </p>
          )}
          <h1 className="text-balance text-3xl font-semibold">{product.title}</h1>
          {product.ratingCount > 0 && (
            <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <Star className="size-3.5 fill-[#FF9500] text-[#FF9500]" aria-hidden />
              <span className="font-semibold text-foreground">{product.ratingAvg.toFixed(1)}</span>
              <span>· {product.ratingCount} ratings</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold tracking-tight">{formatGHS(chosen.price)}</span>
          {onSale && chosen.compareAtPrice != null && (
            <>
              <span className="text-muted-foreground line-through">
                {formatGHS(chosen.compareAtPrice)}
              </span>
              <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[13px] font-semibold text-destructive">
                Save {formatGHS(chosen.compareAtPrice - chosen.price)}
              </span>
            </>
          )}
        </div>

        {product.variants.length > 1 && (
          <div className="space-y-2.5">
            <p className="text-[13px] font-semibold text-muted-foreground">Choose an option</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {product.variants.map((v) => {
                const active = v.id === chosen.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => select(v)}
                    aria-pressed={active}
                    className={`pressable rounded-xl bg-card px-4 py-3 text-left transition-shadow ${
                      active
                        ? 'ring-2 ring-primary'
                        : 'ring-1 ring-black/[0.06] hover:ring-black/15'
                    } ${v.available <= 0 ? 'opacity-50' : ''}`}
                  >
                    <span className="block text-[15px] font-medium">{variantLabel(v)}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      {formatGHS(v.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="flex items-center gap-2 text-[15px]">
          <span
            className={`size-2 rounded-full ${chosen.available > 0 ? 'bg-success' : 'bg-destructive'}`}
            aria-hidden
          />
          {chosen.available > 0 ? (
            <span>
              In stock
              {chosen.available < 5 && (
                <span className="text-muted-foreground"> — only {chosen.available} left</span>
              )}
            </span>
          ) : (
            <span className="text-destructive">Out of stock</span>
          )}
        </p>

        <div className="flex items-center gap-3">
          <div className="inline-flex h-12 items-center rounded-full bg-secondary p-1">
            <button
              type="button"
              className="pressable flex size-10 items-center justify-center rounded-full hover:bg-card disabled:opacity-30"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={pending || qty <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-8 text-center text-[15px] font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              className="pressable flex size-10 items-center justify-center rounded-full hover:bg-card disabled:opacity-30"
              onClick={() => setQty((q) => Math.min(chosen.available, q + 1))}
              disabled={pending || qty >= chosen.available}
              aria-label="Increase quantity"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            disabled={chosen.available <= 0 || pending}
            onClick={add}
            className="pressable h-12 flex-1 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {pending ? 'Adding…' : 'Add to Bag'}
          </button>
        </div>
        {message && (
          <p className="rounded-xl bg-secondary px-4 py-3 text-[13px] text-muted-foreground">
            {message}
          </p>
        )}

        {/* Assurances — grouped list */}
        <ul className="overflow-hidden rounded-2xl bg-card text-[15px]">
          {[
            {
              icon: ShieldCheck,
              title:
                product.warrantyMonths > 0
                  ? `${product.warrantyMonths}-month warranty`
                  : 'Seller warranty',
              sub: product.warrantyProvider ?? 'Serial recorded at dispatch',
            },
            { icon: Truck, title: 'Delivery in Accra', sub: '1–3 days' },
            {
              icon: Wallet,
              title: 'Mobile money or card',
              sub: 'Via Paystack',
            },
          ].map(({ icon: Icon, title, sub }, i) => (
            <li key={title} className="flex items-center gap-3 pl-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/70">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div className={`flex-1 py-3 pr-4 ${i > 0 ? 'border-t border-black/[0.06]' : ''}`}>
                <p className="font-medium">{title}</p>
                <p className="text-[13px] text-muted-foreground">{sub}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">SKU {chosen.sku}</p>
      </div>
    </div>
  );
}

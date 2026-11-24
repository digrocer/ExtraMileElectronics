'use client';

import { formatGHS } from '@extramile/core';
import { Lock, MapPin, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { quoteAction } from '@/lib/checkout/actions';
import type { CheckoutQuote, ShippingZoneView } from '@/lib/checkout/quote';

export interface AddressView {
  id: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  landmark: string | null;
}

function SectionTitle({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      {children}
    </h2>
  );
}

export function CheckoutForm({
  zones,
  addresses,
  initialQuote,
  defaultEmail,
}: {
  zones: ShippingZoneView[];
  addresses: AddressView[];
  initialQuote: CheckoutQuote;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState<CheckoutQuote>(initialQuote);
  const [refreshing, startRefresh] = useTransition();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState('');
  const [zoneId, setZoneId] = useState(initialQuote.zoneId ?? zones[0]?.id ?? '');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(initialQuote.couponCode);

  const [addr, setAddr] = useState({
    recipient: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    landmark: '',
  });

  function refresh(nextZone: string, coupon: string | null) {
    startRefresh(async () => {
      const q = await quoteAction(nextZone || null, coupon);
      setQuote(q);
      setAppliedCoupon(q.couponCode);
    });
  }

  function onZoneChange(id: string) {
    setZoneId(id);
    refresh(id, appliedCoupon);
  }

  function applyCoupon() {
    if (!couponInput.trim()) return;
    refresh(zoneId, couponInput);
  }
  function removeCoupon() {
    setCouponInput('');
    refresh(zoneId, null);
  }

  function pickAddress(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setAddr({
      recipient: a.recipient,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      region: a.region,
      landmark: a.landmark ?? '',
    });
    setPhone((p) => p || a.phone);
  }

  async function placeOrder() {
    setError(null);
    if (
      !email ||
      !phone ||
      !zoneId ||
      !addr.recipient ||
      !addr.line1 ||
      !addr.city ||
      !addr.region
    ) {
      setError('Please fill in your contact and delivery details.');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          zoneId,
          couponCode: appliedCoupon ?? undefined,
          shipTo: {
            recipient: addr.recipient,
            phone: addr.phone || phone,
            line1: addr.line1,
            line2: addr.line2 || undefined,
            city: addr.city,
            region: addr.region,
            landmark: addr.landmark || undefined,
          },
        }),
      });
      const data: { orderNumber?: string; orderId?: string; error?: string } = await res.json();
      if (!res.ok || !data.orderNumber || !data.orderId) {
        setError(data.error ?? 'Could not place your order.');
        setPlacing(false);
        return;
      }
      window.dispatchEvent(new Event('cart:changed'));

      // Initialize Paystack and redirect to the hosted checkout.
      try {
        const payRes = await fetch('/api/checkout/pay', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId }),
        });
        const pay: { authorizationUrl?: string } = await payRes.json();
        if (pay.authorizationUrl) {
          window.location.href = pay.authorizationUrl;
          return;
        }
      } catch {
        // fall through to the processing page, which keeps polling
      }
      router.push(`/checkout/${data.orderNumber}/processing`);
    } catch {
      setError('Network error. Please try again.');
      setPlacing(false);
    }
  }

  const selectedZone = zones.find((z) => z.id === zoneId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {/* Contact */}
        <section className="panel">
          <SectionTitle icon={User}>Contact</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Email</span>
              <input
                type="email"
                autoComplete="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Phone (MoMo)</span>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="0244 123 456"
                className="field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Delivery */}
        <section className="panel space-y-4">
          <SectionTitle icon={MapPin}>Delivery</SectionTitle>

          {addresses.length > 0 && (
            <label className="block">
              <span className="field-label">Use a saved address</span>
              <select
                className="field"
                defaultValue=""
                onChange={(e) => pickAddress(e.target.value)}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.recipient} — {a.line1}, {a.city}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="field"
              placeholder="Recipient name"
              autoComplete="name"
              value={addr.recipient}
              onChange={(e) => setAddr({ ...addr, recipient: e.target.value })}
            />
            <input
              className="field"
              placeholder="Recipient phone"
              value={addr.phone}
              onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
            />
            <input
              className="field sm:col-span-2"
              placeholder="Address line 1"
              autoComplete="address-line1"
              value={addr.line1}
              onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
            />
            <input
              className="field sm:col-span-2"
              placeholder="Address line 2 (optional)"
              autoComplete="address-line2"
              value={addr.line2}
              onChange={(e) => setAddr({ ...addr, line2: e.target.value })}
            />
            <input
              className="field"
              placeholder="City / town"
              value={addr.city}
              onChange={(e) => setAddr({ ...addr, city: e.target.value })}
            />
            <input
              className="field"
              placeholder="Region"
              value={addr.region}
              onChange={(e) => setAddr({ ...addr, region: e.target.value })}
            />
            <input
              className="field sm:col-span-2"
              placeholder="Landmark (optional)"
              value={addr.landmark}
              onChange={(e) => setAddr({ ...addr, landmark: e.target.value })}
            />
          </div>

          <fieldset>
            <legend className="field-label">Delivery zone</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {zones.map((z) => {
                const active = z.id === zoneId;
                return (
                  <button
                    key={z.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onZoneChange(z.id)}
                    className={`pressable rounded-2xl px-4 py-3 text-left transition-shadow ${
                      active
                        ? 'bg-primary/[0.06] ring-2 ring-primary'
                        : 'bg-black/[0.03] ring-1 ring-black/[0.06] hover:ring-black/15'
                    }`}
                  >
                    <span className="flex justify-between gap-2 text-[15px] font-medium">
                      {z.name}
                      <span>{z.baseFee === 0 ? 'Free' : formatGHS(z.baseFee)}</span>
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {z.etaMin}–{z.etaMax} days
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>
      </div>

      {/* Summary */}
      <aside className="panel h-fit space-y-5 lg:sticky lg:top-20">
        <h2 className="text-xl font-bold">Order summary</h2>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="field uppercase placeholder:normal-case"
              placeholder="Discount code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              disabled={Boolean(appliedCoupon)}
            />
            {appliedCoupon ? (
              <button type="button" className="btn-tinted btn-sm h-11" onClick={removeCoupon}>
                Remove
              </button>
            ) : (
              <button
                type="button"
                className="btn-tinted btn-sm h-11"
                onClick={applyCoupon}
                disabled={refreshing}
              >
                Apply
              </button>
            )}
          </div>
          {appliedCoupon && <p className="text-[13px] text-success">Applied {appliedCoupon}.</p>}
          {quote.couponError && <p className="text-[13px] text-destructive">{quote.couponError}</p>}
        </div>

        <dl
          className={`space-y-2 text-[15px] transition-opacity ${refreshing ? 'opacity-50' : ''}`}
        >
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal ({quote.itemCount})</dt>
            <dd>{formatGHS(quote.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd>{quote.shipping === 0 ? 'Free' : formatGHS(quote.shipping)}</dd>
          </div>
          {quote.discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>Discount</dt>
              <dd>−{formatGHS(quote.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-black/[0.06] pt-3 text-[17px] font-bold">
            <dt>Total</dt>
            <dd>{formatGHS(quote.total)}</dd>
          </div>
          {selectedZone && (
            <p className="text-[13px] text-muted-foreground">
              Arrives in {selectedZone.etaMin}–{selectedZone.etaMax} days.
            </p>
          )}
        </dl>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={placeOrder}
          disabled={placing || refreshing}
        >
          <Lock className="size-4" aria-hidden />
          {placing ? 'Placing order…' : `Pay ${formatGHS(quote.total)}`}
        </button>
        <p className="text-center text-[13px] text-muted-foreground">
          Pay securely via Paystack — mobile money, card or bank.
        </p>
      </aside>
    </div>
  );
}

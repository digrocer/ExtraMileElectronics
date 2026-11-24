import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutForm, type AddressView } from '@/components/checkout/checkout-form';
import { getCart } from '@/lib/cart/cart';
import { getCheckoutQuote, getShippingZones } from '@/lib/checkout/quote';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Checkout' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const cart = await getCart();
  if (cart.lines.length === 0) redirect('/cart');

  const zones = await getShippingZones();
  const defaultZone = zones[0]?.id ?? null;
  const quote = await getCheckoutQuote(defaultZone, null);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let addresses: AddressView[] = [];
  if (user) {
    const { data } = await supabase
      .from('addresses')
      .select('id, recipient, phone, line1, line2, city, region, landmark')
      .eq('user_id', user.id)
      .returns<AddressView[]>();
    addresses = data ?? [];
  }

  return (
    <main className="container max-w-5xl pb-20 pt-6">
      <h1 className="large-title mb-6">Checkout</h1>
      <CheckoutForm
        zones={zones}
        addresses={addresses}
        initialQuote={quote}
        defaultEmail={user?.email ?? ''}
      />
    </main>
  );
}

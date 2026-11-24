import { ChevronRight, KeyRound, LogOut, Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Your account' };

const rows = [
  { href: '/account/orders', icon: Package, label: 'Orders & tracking' },
  {
    href: '/account/connected-accounts',
    icon: KeyRound,
    label: 'Connected accounts',
  },
];

export default async function AccountPage() {
  // Middleware already guards this route; getUser() is the authoritative check.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initial = (user?.email ?? '?').charAt(0).toUpperCase();

  return (
    <main className="container max-w-2xl space-y-6 pb-20 pt-6">
      <h1 className="large-title">Account</h1>

      <div className="panel flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-xl font-semibold text-foreground/70">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold">{user?.email}</p>
          <p className="text-[13px] text-muted-foreground">ExtraMile customer</p>
        </div>
      </div>

      <nav className="grouped">
        {rows.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3 text-[17px] transition-colors hover:bg-black/[0.03]"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground/70">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="flex-1">{label}</span>
            <ChevronRight className="size-5 text-muted-foreground/50" aria-hidden />
          </Link>
        ))}
      </nav>

      <form action="/auth/signout" method="post" className="grouped">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 px-4 py-3 text-[17px] font-medium text-destructive transition-colors hover:bg-black/[0.03]"
        >
          <LogOut className="size-[18px]" aria-hidden /> Sign out
        </button>
      </form>
    </main>
  );
}

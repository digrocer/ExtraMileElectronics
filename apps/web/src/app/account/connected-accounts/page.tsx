import type { Metadata } from 'next';
import { ConnectedAccounts } from '@/components/auth/connected-accounts';

export const metadata: Metadata = { title: 'Connected accounts' };

export default function ConnectedAccountsPage() {
  return (
    <main className="container max-w-2xl space-y-6 pb-20 pt-6">
      <div>
        <h1 className="large-title">Connected accounts</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Link Google or Apple so you can sign in either way.
        </p>
      </div>
      <ConnectedAccounts />
    </main>
  );
}

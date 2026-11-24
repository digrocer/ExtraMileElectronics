import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { OfflineBanner } from '../components/OfflineBanner';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { Catalogue } from './Catalogue';
import { Dashboard } from './Dashboard';
import { Inventory } from './Inventory';
import { Orders } from './Orders';
import { Users } from './Users';

type View = 'home' | 'orders' | 'catalogue' | 'inventory' | 'users';

export function Shell() {
  const { user, role, lock } = useAuth();
  const { online, lastSync } = useOfflineSync(true);
  const [view, setView] = useState<View>('home');

  const tabs: { id: View; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'orders', label: 'Orders' },
    { id: 'catalogue', label: 'Catalogue' },
    { id: 'inventory', label: 'Inventory' },
    ...(role === 'admin' ? [{ id: 'users' as const, label: 'Users' }] : []),
  ];

  return (
    <div className="screen">
      <OfflineBanner online={online} lastSync={lastSync} />
      <header className="topbar">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <strong>ExtraMile Back-office</strong>
          <nav style={{ display: 'flex', gap: '.5rem' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                className="btn secondary"
                style={{ borderColor: view === t.id ? 'hsl(var(--primary))' : undefined }}
                onClick={() => setView(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="muted">
            {user?.email} · {role} · {online ? 'online' : 'offline'}
          </span>
          <button className="btn secondary" onClick={lock}>
            Lock
          </button>
        </div>
      </header>
      {view === 'home' && <Dashboard />}
      {view === 'orders' && <Orders />}
      {view === 'catalogue' && <Catalogue />}
      {view === 'inventory' && <Inventory />}
      {view === 'users' && role === 'admin' && <Users />}
    </div>
  );
}

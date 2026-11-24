import { useEffect, useState } from 'react';
import { deviceId } from '../lib/tauri';

export function Dashboard() {
  const [device, setDevice] = useState('');

  useEffect(() => {
    void deviceId().then(setDevice);
  }, []);

  return (
    <main style={{ padding: '1.5rem' }}>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p className="muted">
        <strong>Orders</strong> — pack, scan serials, dispatch and print receipts, online or
        offline. <strong>Catalogue</strong> — add products, variants and images, set prices and
        stock, publish to the storefront. <strong>Inventory</strong> — stock levels, low-stock
        alerts and valuation. <strong>Users</strong> (admins) — change roles and invite staff.
        Walk-in sales continues in a later increment.
      </p>
      <p className="muted">Device id: {device}</p>
    </main>
  );
}

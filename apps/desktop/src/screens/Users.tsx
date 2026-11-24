import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { changeRole, inviteStaff, listUsers, ROLES, type Role, type UserRow } from '../lib/users';

/** User management — admin only (role_change / staff_invite are admin-only server-side). */
export function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setUsers(await listUsers());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const report = (fn: () => Promise<void>, ok: string) => async () => {
    setMessage(null);
    try {
      await fn();
      setMessage(ok);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed.');
    }
  };

  return (
    <main style={{ padding: '1.5rem', display: 'grid', gap: '1.25rem', maxWidth: '50rem' }}>
      <h1 style={{ margin: 0 }}>Users</h1>
      {message && <p className="muted">{message}</p>}

      <InviteForm
        onInvite={(email, role) =>
          report(() => inviteStaff(email, role), `Invitation sent to ${email}.`)()
        }
      />

      <section style={{ display: 'grid', gap: '.4rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>All users ({users.length})</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {users.map((u) => (
            <li
              key={u.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '.5rem',
                padding: '.5rem 0',
                borderBottom: '1px solid hsl(var(--border))',
              }}
            >
              <div>
                <div>{u.full_name || <span className="muted">unnamed</span>}</div>
                <div className="muted" style={{ fontSize: '.8rem' }}>
                  {u.phone ?? 'no phone'}
                </div>
              </div>
              <select
                className="input"
                value={u.role}
                onChange={(e) =>
                  report(() => changeRole(u.id, e.target.value as Role), 'Role updated.')()
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function InviteForm({ onInvite }: { onInvite: (email: string, role: Role) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('staff');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(email.trim(), role);
    setEmail('');
  }

  return (
    <form className="card" style={{ maxWidth: 'none' }} onSubmit={submit}>
      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Invite staff</h2>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <input
          className="input"
          type="email"
          placeholder="new.staff@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 2 }}
        />
        <select
          className="input"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          style={{ flex: 1 }}
        >
          <option value="staff">staff</option>
          <option value="admin">admin</option>
        </select>
        <button className="btn" disabled={!email.trim()}>
          Invite
        </button>
      </div>
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';

const PIN_LEN = 6;
const onlyDigits = (s: string) => s.replace(/\D/g, '').slice(0, PIN_LEN);

/** Enrolment (first run) and daily PIN unlock — the desktop's only login screen. */
export function PinScreen() {
  const { phase } = useAuth();
  return <div className="center">{phase === 'enroll' ? <Enroll /> : <Unlock />}</div>;
}

/** One-time device bind: verify a real admin account once, then choose a 6-digit PIN. */
function Enroll() {
  const { enroll, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length === PIN_LEN && pin !== confirm;
  const ready = email && password && pin.length === PIN_LEN && pin === confirm;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    await enroll(email, password, pin);
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Set up this device</h1>
      <p className="muted">
        Sign in once with an admin account to bind this device, then choose a 6-digit PIN. After
        setup you only use the PIN.
      </p>
      <input
        className="input"
        type="email"
        placeholder="Admin email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="input"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        className="input"
        inputMode="numeric"
        placeholder="New 6-digit PIN"
        value={pin}
        onChange={(e) => setPin(onlyDigits(e.target.value))}
      />
      <input
        className="input"
        inputMode="numeric"
        placeholder="Confirm PIN"
        value={confirm}
        onChange={(e) => setConfirm(onlyDigits(e.target.value))}
      />
      <button className="btn" disabled={busy || !ready}>
        {busy ? 'Setting up…' : 'Bind device & set PIN'}
      </button>
      {mismatch && <p className="error">PINs do not match.</p>}
      {error && <p className="error">{error}</p>}
    </form>
  );
}

/** Daily unlock — 6-digit PIN restores the stored session. */
function Unlock() {
  const { unlock, signOut, error } = useAuth();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length !== PIN_LEN) return;
    setBusy(true);
    await unlock(pin);
    setBusy(false);
    setPin('');
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1 style={{ margin: 0, fontSize: '1.2rem' }}>ExtraMile Back-office</h1>
      <p className="muted">Enter your 6-digit PIN.</p>
      <input
        className="input"
        inputMode="numeric"
        autoFocus
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(onlyDigits(e.target.value))}
        style={{ letterSpacing: '0.4rem', textAlign: 'center', fontSize: '1.2rem' }}
      />
      <button className="btn" disabled={busy || pin.length !== PIN_LEN}>
        {busy ? 'Unlocking…' : 'Unlock'}
      </button>
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn secondary" onClick={() => void signOut()}>
        Forget this device
      </button>
    </form>
  );
}

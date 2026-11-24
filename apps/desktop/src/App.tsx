import { useAuth } from './auth/AuthProvider';
import { PinScreen } from './auth/PinScreen';
import { useIdleLock } from './hooks/useIdleLock';
import { Shell } from './screens/Shell';

const IDLE_MS = 15 * 60 * 1000;

export function App() {
  const { phase, lock } = useAuth();
  useIdleLock(phase === 'ready', IDLE_MS, lock);

  if (phase === 'loading') {
    return (
      <div className="center">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (phase !== 'ready') return <PinScreen />;
  return <Shell />;
}

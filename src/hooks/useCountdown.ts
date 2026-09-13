import { useEffect, useState } from 'react';

export function useCountdown(deadlineAt: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadlineAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  if (deadlineAt == null) return 60;
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

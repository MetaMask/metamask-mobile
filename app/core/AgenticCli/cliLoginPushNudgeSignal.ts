type Listener = () => void;

const listeners = new Set<Listener>();

export const emitCliLoginPushNudge = (): void => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Listeners must never break the emit loop.
    }
  });
};

export const subscribeCliLoginPushNudge = (
  listener: Listener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Test-only helper — resets subscribers between tests.
export const __resetCliLoginPushNudgeListenersForTests = (): void => {
  listeners.clear();
};

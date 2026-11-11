type RotationListener = () => void;

interface RotationClock {
  joinedAt: Map<RotationListener, number>;
  interval: ReturnType<typeof setInterval>;
}

const clocks = new Map<number, RotationClock>();

const startClock = (intervalMs: number): RotationClock => {
  const joinedAt = new Map<RotationListener, number>();
  return {
    joinedAt,
    interval: setInterval(() => {
      const now = Date.now();
      // A stat that has only just appeared, e.g. on a row still entering,
      // holds through this tick rather than flipping right away.
      [...joinedAt]
        .filter(([, at]) => now - at >= intervalMs / 2)
        .forEach(([listener]) => listener());
    }, intervalMs),
  };
};

/**
 * Rotates every subscribed stat from one timer, so the swaps across a whole
 * feed land in the same React commit instead of one commit per row. The timer
 * runs only while someone is subscribed.
 */
export const subscribeToTraderStatRotation = (
  intervalMs: number,
  onRotate: RotationListener,
): (() => void) => {
  const clock = clocks.get(intervalMs) ?? startClock(intervalMs);
  clocks.set(intervalMs, clock);
  clock.joinedAt.set(onRotate, Date.now());

  return () => {
    clock.joinedAt.delete(onRotate);
    if (clock.joinedAt.size === 0) {
      clearInterval(clock.interval);
      clocks.delete(intervalMs);
    }
  };
};

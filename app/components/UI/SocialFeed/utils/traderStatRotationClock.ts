export interface TraderStatRotationListener {
  /** Start hiding the current stat. */
  fadeOut: () => void;
  /** Show the next stat. Fires `fadeMs` after `fadeOut`, while it is hidden. */
  swap: () => void;
}

interface RotationClock {
  joinedAt: Map<TraderStatRotationListener, number>;
  interval: ReturnType<typeof setInterval>;
  swapTimer?: ReturnType<typeof setTimeout>;
}

const clocks = new Map<string, RotationClock>();

const startClock = (intervalMs: number, fadeMs: number): RotationClock => {
  const joinedAt = new Map<TraderStatRotationListener, number>();
  const clock: RotationClock = {
    joinedAt,
    interval: setInterval(() => {
      const now = Date.now();
      // A stat that has only just appeared, e.g. on a row still entering,
      // holds through this tick rather than flipping right away.
      const rotating = [...joinedAt]
        .filter(([, at]) => now - at >= intervalMs / 2)
        .map(([listener]) => listener);
      rotating.forEach((listener) => listener.fadeOut());
      clock.swapTimer = setTimeout(() => {
        rotating.forEach((listener) => {
          if (joinedAt.has(listener)) {
            listener.swap();
          }
        });
      }, fadeMs);
    }, intervalMs),
  };
  return clock;
};

/**
 * Rotates every subscribed stat from one timer, so the swaps across a whole
 * feed land in the same React commit instead of one commit per row. The timer
 * runs only while someone is subscribed.
 */
export const subscribeToTraderStatRotation = (
  intervalMs: number,
  fadeMs: number,
  listener: TraderStatRotationListener,
): (() => void) => {
  const key = `${intervalMs}:${fadeMs}`;
  const clock = clocks.get(key) ?? startClock(intervalMs, fadeMs);
  clocks.set(key, clock);
  clock.joinedAt.set(listener, Date.now());

  return () => {
    clock.joinedAt.delete(listener);
    if (clock.joinedAt.size === 0) {
      clearInterval(clock.interval);
      clearTimeout(clock.swapTimer);
      clocks.delete(key);
    }
  };
};

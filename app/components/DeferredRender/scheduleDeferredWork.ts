export type DeferredFrameMode = 'frame' | 'frame-then-idle';

interface IdleHost {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

function idleHost(): IdleHost {
  return globalThis as typeof globalThis & IdleHost;
}

/**
 * Runs `task` after the next animation frame. The first release of a visit
 * also waits for `requestIdleCallback` when the runtime provides it, so the
 * mount does not share the transition's last turn.
 *
 * A timeout always arms alongside the frame. Whichever path runs first wins;
 * the other is cancelled. `cancel` drops every handle and guarantees `task`
 * does not run.
 */
export function scheduleDeferredWork(
  task: () => void,
  timeoutMs: number,
  mode: DeferredFrameMode,
): () => void {
  let settled = false;
  let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
  let idleId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const clearHandles = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (idleId !== null) {
      idleHost().cancelIdleCallback?.(idleId);
      idleId = null;
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const finish = () => {
    if (settled) {
      return;
    }
    settled = true;
    clearHandles();
    task();
  };

  const cancel = () => {
    settled = true;
    clearHandles();
  };

  timeoutId = setTimeout(finish, timeoutMs);

  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (settled) {
      return;
    }

    const requestIdle = idleHost().requestIdleCallback;
    if (mode === 'frame-then-idle' && typeof requestIdle === 'function') {
      idleId = requestIdle(
        () => {
          idleId = null;
          finish();
        },
        { timeout: timeoutMs },
      );
      return;
    }

    finish();
  });

  return cancel;
}

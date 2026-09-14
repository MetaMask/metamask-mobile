/**
 * Cancellable handle returned by {@link scheduleAfterPaint}.
 */
export interface ScheduleAfterPaintHandle {
  cancel: () => void;
}

/**
 * Schedules `callback` to run after the next paint has been committed.
 *
 * Uses a double `requestAnimationFrame`:
 * - the first callback runs before the upcoming paint
 * - the second runs after that paint is committed
 *
 * This is an explicit post-paint gate. Prefer it over
 * `InteractionManager.runAfterInteractions` on React Native 0.83+, where that
 * API is a `setImmediate` stub and does not wait for interactions or paint.
 *
 * Falls back to `setTimeout(0)` when `requestAnimationFrame` is unavailable
 * (e.g. some test environments).
 *
 * @param callback - Work to run after the next paint.
 * @returns A handle that cancels the scheduled work if it has not started.
 */
export function scheduleAfterPaint(
  callback: () => void,
): ScheduleAfterPaintHandle {
  let cancelled = false;

  if (typeof requestAnimationFrame !== 'function') {
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        callback();
      }
    }, 0);

    return {
      cancel() {
        cancelled = true;
        clearTimeout(timeoutId);
      },
    };
  }

  let outerRafId = 0;
  let innerRafId = 0;

  outerRafId = requestAnimationFrame(() => {
    if (cancelled) {
      return;
    }
    innerRafId = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      callback();
    });
  });

  return {
    cancel() {
      cancelled = true;
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
    },
  };
}

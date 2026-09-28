/**
 * Cancels real timers that outlive a test file.
 *
 * `jest-environment-node.teardown()` disposes fake timers only — a real
 * `setTimeout`/`setInterval`/`setImmediate` that is still pending when a suite
 * finishes keeps its callback closure, and therefore the suite's entire module
 * registry (hundreds of MB once React Native, Engine and the controllers are
 * loaded), reachable for the rest of the Jest process. With `maxWorkers: 1`
 * those registries pile up in a single heap until the run dies with
 * "Ineffective mark-compacts near heap limit". The same stragglers produce
 * "You are trying to `import` a file after the Jest environment has been torn
 * down" when they fire late.
 *
 * `installTimerLeakGuard()` is called from `setupFilesAfterEnv`, so the timer
 * globals are wrapped before any test runs and the leftovers are cancelled in
 * a root-level `afterAll`.
 */

/* eslint-disable import-x/no-commonjs */

// An interval stays pending until it is cancelled; a timeout and an immediate
// are done once they fire, and holding on to their ids would retain the very
// closures this guard exists to release.
const TIMER_KINDS = [
  { schedule: 'setTimeout', cancel: 'clearTimeout', untrackOnFire: true },
  { schedule: 'setInterval', cancel: 'clearInterval', untrackOnFire: false },
  { schedule: 'setImmediate', cancel: 'clearImmediate', untrackOnFire: true },
];

const trackSchedule = (schedule, pending, untrackOnFire) =>
  function trackedSchedule(handler, ...rest) {
    let id = null;
    const callback =
      untrackOnFire && typeof handler === 'function'
        ? (...args) => {
            pending.delete(id);
            return handler(...args);
          }
        : handler;

    id = schedule(callback, ...rest);
    pending.add(id);
    return id;
  };

const trackCancel = (cancel, pending) =>
  function trackedCancel(id) {
    pending.delete(id);
    return cancel(id);
  };

/**
 * Wraps the timer functions of `target` so pending ones can be cancelled later.
 *
 * @param {object} target - Object holding the timer globals to wrap.
 * @returns {() => void} Cancels every timer still pending at call time.
 */
const trackPendingTimers = (target) => {
  const cancelPending = [];

  TIMER_KINDS.forEach(({ schedule, cancel, untrackOnFire }) => {
    const originalSchedule = target[schedule];
    const originalCancel = target[cancel];

    if (
      typeof originalSchedule !== 'function' ||
      typeof originalCancel !== 'function'
    ) {
      return;
    }

    const pending = new Set();

    // Node exposes extras on the timer functions (e.g. the promisify hook), so
    // copy them onto the wrapper rather than replacing the function outright.
    target[schedule] = Object.assign(
      trackSchedule(originalSchedule, pending, untrackOnFire),
      originalSchedule,
    );
    target[cancel] = trackCancel(originalCancel, pending);

    cancelPending.push(() => {
      pending.forEach((id) => originalCancel(id));
      pending.clear();
    });
  });

  return () => cancelPending.forEach((cancelKind) => cancelKind());
};

const installTimerLeakGuard = () => {
  const clearPendingTimers = trackPendingTimers(global);

  // Fake timers swap the globals out and dispose of their own queue, so only
  // real stragglers are left to cancel here.
  afterAll(clearPendingTimers);
};

module.exports = { installTimerLeakGuard, trackPendingTimers };

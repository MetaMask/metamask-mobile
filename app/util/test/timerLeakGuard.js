/**
 * Cancels real timers that outlive a test file.
 *
 * `jest-environment-node.teardown()` disposes fake timers only — a real
 * `setTimeout`/`setInterval` that is still pending when a suite finishes keeps
 * its callback closure, and therefore the suite's entire module registry
 * (hundreds of MB once React Native, Engine and the controllers are loaded),
 * reachable for the rest of the Jest process. With `maxWorkers: 1` those
 * registries pile up in a single heap until the run dies with "Ineffective
 * mark-compacts near heap limit". The same stragglers produce "You are trying
 * to `import` a file after the Jest environment has been torn down" when they
 * fire late.
 *
 * `installTimerLeakGuard()` is called from `setupFilesAfterEnv`, so the timer
 * globals are wrapped before any test runs and the leftovers are cancelled in
 * a root-level `afterAll`.
 */

/* eslint-disable import-x/no-commonjs */

/**
 * Wraps the timer functions of `target` so pending ones can be cancelled later.
 *
 * @param {object} target - Object holding the timer globals to wrap.
 * @returns {() => void} Cancels every timer still pending at call time.
 */
const trackPendingTimers = (target) => {
  const pendingTimeouts = new Set();
  const pendingIntervals = new Set();

  const originalSetTimeout = target.setTimeout;
  const originalClearTimeout = target.clearTimeout;
  const originalSetInterval = target.setInterval;
  const originalClearInterval = target.clearInterval;

  const track = (schedule, pending, untrackOnFire) =>
    function trackedSchedule(handler, ...rest) {
      let id = null;
      const callback =
        untrackOnFire && typeof handler === 'function'
          ? (...args) => {
              // A fired timeout is no longer pending; keeping its id would
              // retain the very closure this guard exists to release.
              pending.delete(id);
              return handler(...args);
            }
          : handler;

      id = schedule(callback, ...rest);
      pending.add(id);
      return id;
    };

  const untrack = (clear, pending) =>
    function trackedClear(id) {
      pending.delete(id);
      return clear(id);
    };

  // Node exposes extras on the timer functions (e.g. the promisify hook), so
  // copy them onto the wrappers rather than replacing the functions outright.
  target.setTimeout = Object.assign(
    track(originalSetTimeout, pendingTimeouts, true),
    originalSetTimeout,
  );
  target.clearTimeout = untrack(originalClearTimeout, pendingTimeouts);
  target.setInterval = Object.assign(
    track(originalSetInterval, pendingIntervals, false),
    originalSetInterval,
  );
  target.clearInterval = untrack(originalClearInterval, pendingIntervals);

  return () => {
    pendingTimeouts.forEach((id) => originalClearTimeout(id));
    pendingIntervals.forEach((id) => originalClearInterval(id));
    pendingTimeouts.clear();
    pendingIntervals.clear();
  };
};

const installTimerLeakGuard = () => {
  const clearPendingTimers = trackPendingTimers(global);

  // Fake timers swap the globals out and dispose of their own queue, so only
  // real stragglers are left to cancel here.
  afterAll(clearPendingTimers);
};

module.exports = { installTimerLeakGuard, trackPendingTimers };

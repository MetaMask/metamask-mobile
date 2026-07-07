/* eslint-disable import-x/no-commonjs, import-x/no-extraneous-dependencies, no-console */

/**
 * Patches gaps in the legacy inline `jest.mock('react-native-worklets', ...)`
 * defined in `testSetup.js`. That mock predates `react-native-worklets`
 * being an installed (transitive, via `react-native-reanimated`) dependency
 * and has drifted from the mock the package now ships itself, most
 * importantly by:
 *
 * 1. Never setting the globals Reanimated's `valueSetter` reads directly
 *    (`global._getAnimationTimestamp`, `global._WORKLET`, etc.) — causing
 *    `TypeError: global._getAnimationTimestamp is not a function` whenever
 *    a shared value is set via `withTiming`/`withSpring`/etc.
 * 2. Hardcoding `isWorkletFunction` to always return `false` — causing
 *    `useAnimatedScrollHandler`/`useAnimatedGestureHandler` to reject valid
 *    worklet handlers with `ReanimatedError: Passed a function that is not
 *    a worklet.`
 *
 * `testSetup.js` already `require()`s `react-native-reanimated` (which in
 * turn requires `react-native-worklets`) before this file runs, so
 * `react-native-reanimated` holds a reference to the exact module object
 * returned by the legacy mock's factory. Registering a *new* `jest.mock`
 * factory here would only affect subsequent fresh `require` calls — it
 * would never be invoked, since nothing re-requires the module afterwards.
 * Instead we mutate that already-cached object in place (and set the
 * missing globals), which is visible to every existing reference to it,
 * including Reanimated's.
 *
 * See: https://docs.swmansion.com/react-native-worklets/docs/guides/testing/
 */
const worklets = require('react-native-worklets');

global._WORKLET = false;
global.__RUNTIME_KIND = 0; // RuntimeKind.ReactNative
global._log = console.log;
global._getAnimationTimestamp = () => global.performance.now();

worklets.isWorkletFunction = (value) =>
  typeof value === 'function' && !!value.__workletHash;

/* eslint-disable import/no-commonjs */
/**
 * Centralized whitelist of modules allowed to be mocked in component-view tests.
 * Consumed by both the runtime guard (testSetupView.js) and ESLint configuration.
 */
module.exports = [
  // Core business logic: mocked to isolate view tests from complex state/side-effects
  '../../../core/Engine',
  '../../../core/Engine/Engine',
  // Native modules: mocked for deterministic behavior
  'react-native-device-info',
  'react-native/Libraries/Animated/Easing',
  // App components: mocked to avoid async operations (e.g. image sizing) causing act() warnings
  '../../components/Base/RemoteImage',
];

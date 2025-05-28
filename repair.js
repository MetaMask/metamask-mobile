/**
 * Repair JS intrinsics
 *
 * The Hermes (or vanilla) SES shim is loaded as the first Metro polyfill, so
 * {@link repairIntrinsics} can be called.
 *
 * Called with lockdown options ideal for React Native apps.
 *
 * {@link lockdown} itself is not called to allow for vetted shims as Metro
 * polyfills before hardening (e.g. RN JS polyfills).
 */

// NB: ES5

// eslint-disable-next-line no-var
var dumbPolyfillExposedInternals = Object.entries(Promise).filter(
  // eslint-disable-next-line prefer-arrow-callback
  function (entry) {
    return !!entry[1] && entry[0].startsWith('_');
  },
);

// eslint-disable-next-line no-undef
repairIntrinsics({
  errorTaming: 'unsafe',
  consoleTaming: 'unsafe',
  errorTrapping: 'none',
  unhandledRejectionTrapping: 'none',
  overrideTaming: 'severe',
  stackFiltering: 'verbose',
  evalTaming: 'unsafe-eval',
});

// Hermes built-in implementation of Promise is using this global field internally to hold on to a noop function :|
Object.assign(Promise, Object.fromEntries(dumbPolyfillExposedInternals));

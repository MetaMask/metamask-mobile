/* eslint-disable */
/**
 * Pre-lockdown polyfill for `Promise.withResolvers` (ES2024).
 *
 * This runs as a Metro polyfill, which executes AFTER `@react-native/js-polyfills`
 * installs React Native's Promise but BEFORE `@lavamoat/react-native-lockdown`
 * calls `hardenIntrinsics()` (injected right before the entry module, moduleId 0).
 *
 * Why this is needed with the Expo Babel transformer:
 *   `babel-preset-expo` injects core-js's `esnext.promise.with-resolvers`
 *   polyfill into app modules. Those modules evaluate AFTER `hardenIntrinsics()`
 *   has frozen `Promise`, so core-js's `defineBuiltIn(Promise, 'withResolvers')`
 *   throws `TypeError: Cannot add new property 'withResolvers'`.
 *
 * Defining it here fixes that because:
 *   1. SES permits `withResolvers`, so the property survives lockdown, and
 *   2. core-js's `export` helper skips redefining a property that already
 *      exists with the same type (internals/export.js), so it never attempts
 *      the illegal write on the frozen `Promise`.
 *
 * This file must stay in `babel.config.js`'s `ignore` list: as a Metro polyfill
 * there is no module system available yet, and Babel/preset-expo must not inject
 * `require(...)`/core-js into it.
 */
(function () {
  var P = global.Promise;
  if (P && typeof P.withResolvers !== 'function') {
    Object.defineProperty(P, 'withResolvers', {
      configurable: true,
      writable: true,
      value: function withResolvers() {
        var resolve;
        var reject;
        // Use `this` so subclasses of Promise are honoured, matching the spec.
        var promise = new this(function (res, rej) {
          resolve = res;
          reject = rej;
        });
        return { promise: promise, resolve: resolve, reject: reject };
      },
    });
  }
})();

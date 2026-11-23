/**
 * Side-effect module: import it from `index.js` right after the Nitro setup so
 * the Foxy bridge wraps `fetch` before anything else makes a request.
 *
 * No-op unless this is a debug build AND `FOXY=true` is set in
 * `.js.env` (see `scripts/foxy/README.md`).
 */
if (__DEV__ && process.env.FOXY === 'true') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only, keep out of production bundles
    require('./FoxyBridge').installFoxy();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[Foxy] failed to install', error);
  }
}

export {};

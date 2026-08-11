import type React from 'react';

/**
 * Designer Mode — a dev/QA-only visual inspector that lets designers tap any
 * component in the running app, edit its styles, and hand the request to an AI
 * agent which applies the change to source. See `docs/designer-mode.md`.
 *
 * This is gated behind the `DESIGNER_MODE` env var. `transform-inline-environment-variables`
 * (see `babel.config.js`) inlines `process.env.DESIGNER_MODE` at bundle time, so
 * when it is not `'true'` the `require` below is dead code: the inspector UI and
 * its `StyleSheet.create` monkeypatch are never bundled into normal builds.
 *
 * To enable: bundle with `DESIGNER_MODE=true` set in the environment — e.g.
 * `DESIGNER_MODE=true yarn watch:clean` (a cache-clearing start is required so
 * Metro re-runs the env inlining).
 */
const DesignerModeOverlay: React.FC =
  process.env.DESIGNER_MODE === 'true'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require -- intentional dead-code-eliminated lazy load; keeps dev tooling out of prod bundles
      require('./DesignerModeOverlayImpl').default
    : () => null;

export default DesignerModeOverlay;

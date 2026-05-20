// Generates `import-x/no-restricted-paths` zones that enforce route-module
// isolation under `app/components/Views/`, per ADR 0020 (modularize-routes):
// https://github.com/MetaMask/decisions/blob/main/decisions/core/0020-modularize-routes.md
//
// Each top-level subdirectory of `app/components/Views/` is treated as an
// isolated "route module": files inside it may not import from any sibling
// route directory. The React Navigation root navigator
// (`app/components/Nav/Main/MainNavigator.js`) lives outside `Views/`, so
// it is naturally outside any zone's `target` and does not need an
// explicit exemption.
//
// Required by `.eslintrc.js` and merged into the existing
// `import-x/no-restricted-paths` zones list.

const fs = require('node:fs');
const path = require('node:path');

const VIEWS_DIR = path.join(__dirname, '..', 'app/components/Views');

const routeDirs = fs
  .readdirSync(VIEWS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

// For each route, forbid imports from anywhere else inside
// `app/components/Views/` except the route's own directory. The
// `import-x/no-restricted-paths` rule resolves `except` paths relative
// to `from`, so one zone per route is sufficient (no quadratic pair list).
const routeIsolationZones = routeDirs.map((route) => ({
  target: `app/components/Views/${route}`,
  from: 'app/components/Views',
  except: [`./${route}`],
  message:
    `Route directories must be isolated. "${route}" must not import ` +
    `from a sibling route directory. See ADR 0020 (modularize-routes).`,
}));

module.exports = { routeIsolationZones };

# vendor

Files the Foxy dashboard serves from `/vendor/*` so it works offline.

- `foxy-loading.riv`: the animated MetaMask fox used as the logo (Rive file; artboard `Loading`, animation `Loop`, which loops forever).
- `rive.js` and `rive.wasm`: the [Rive](https://rive.app) web runtime, `@rive-app/canvas@2.55.0` (MIT licensed), copied unmodified from the npm package.

If these files are missing, or the server predates the `/vendor` route, the dashboard falls back to the 🦊 emoji. To update the runtime, replace both `rive.js` and `rive.wasm` with the same version from `@rive-app/canvas`.

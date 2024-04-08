/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs*/
import getPreinstalledSnap from '../../util/snaps/getPreinstalledSnap';
import { assert } from '@metamask/utils';
const bundleJs = require('../../../node_modules/@metamask/bip32-example-snap/dist/bundle.js');
const manifestJson = require('../../../node_modules/@metamask/bip32-example-snap/snap.manifest.json');

assert(bundleJs, new TypeError(`BundleJs not found`));
assert(manifestJson, new TypeError(`manifestJson not found`));

let icon;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  icon = require('@metamask/bip32-example-snap/images/icon.svg');
} catch (error) {
  icon = '';
}

export const PREINSTALLED_SNAPS = Object([
  getPreinstalledSnap(
    '@metamask/bip32-example-snap',
    JSON.stringify(manifestJson),
    [
      {
        path: 'images/icon.svg',
        value: icon,
      },
      {
        path: 'dist/bundle.js',
        value: JSON.stringify(bundleJs),
      },
    ],
  ),
]);

export default PREINSTALLED_SNAPS;

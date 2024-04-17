/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs*/
import { assert } from '@metamask/utils';
const bundleJs = require('../../../../../node_modules/@metamask/bip32-example-snap/dist/bundle.js');
const manifestJson = require('../../../../../node_modules/@metamask/bip32-example-snap/snap.manifest.json');

assert(bundleJs, new TypeError(`BundleJs not found`));
assert(manifestJson, new TypeError(`manifestJson not found`));

let icon, bundlePath;
const iconPath = 'images/icon.svg';
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  icon = require('../../../../../node_modules/@metamask/bip32-example-snap/images/icon.svg');
} catch (error) {
  icon = '';
}

const bip32 = {
  manifestJson,
  icon,
  iconPath,
  bundleJs,
  bundlePath,
};

export default bip32;

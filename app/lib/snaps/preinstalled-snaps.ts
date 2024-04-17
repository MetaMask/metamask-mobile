import getPreinstalledSnap from '../../util/snaps/getPreinstalledSnap';
import bip32 from './preinstalled/bip32';

const { name, manifestJson, icon, bundleJs } = bip32;

const PREINSTALLED_SNAPS = Object([
  getPreinstalledSnap(name, JSON.stringify(manifestJson), [
    {
      path: 'images/icon.svg',
      value: icon,
    },
    {
      path: 'dist/bundle.js',
      value: JSON.stringify(bundleJs),
    },
  ]),
]);

export default PREINSTALLED_SNAPS;

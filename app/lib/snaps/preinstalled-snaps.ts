//@ts-ignore
import bundleJs from './embedded/bip32-example-snap/dist/bundle.js';
import manifestJson from './embedded/bip32-example-snap/snap.manifest.json';

let icon;
try {
  icon = require('./embedded/bip32-example-snap/images/icon.svg');
} catch (error) {
  console.error('Module not found, using default icon', error);
  icon = '';
}

export const PREINSTALLED_SNAPS = Object([
  getPreinstalledSnap(
    '@metamask/bip32-example-snap',
    JSON.stringify(manifestJson),
    [
      {
        path: 'images/icon.svg',
        value: icon, //TODO: we could use a default icon in case the snap doesn't have one.
      },
      {
        path: 'dist/bundle.js',
        value: JSON.stringify(bundleJs),
      },
    ],
  ),
]);

function getPreinstalledSnap(
  npmPackage: string,
  manifest: string,
  files: { path: string; value: string }[],
) {
  return {
    snapId: `npm:${npmPackage}`,
    manifest: JSON.parse(manifest),
    files,
    removable: false,
  };
}

export default PREINSTALLED_SNAPS;

/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-commonjs, import/no-nodejs-modules, import/no-nodejs-modules, no-console */
import fs from 'fs';
import path from 'path';
import Logger from '../../util/Logger';

const EMBEDDED_SNAPS_PATH = path.join(__dirname, './embedded');
const snapName = 'bip32-example-snap';
const manifestFile = path.join(
  __dirname,
  `./${EMBEDDED_SNAPS_PATH}/${snapName}/snap.manifest.json`,
);

export const PREINSTALLED_SNAPS = Object([
  'npm:@metamask/bip32-example-snap',
  getPreinstalledSnap(
    '@metamask/bip32-example-snap',
    fs.readFileSync(manifestFile, 'utf-8'),
    [
      {
        path: 'images/icon.svg',
        value: fs.readFileSync(
          `${EMBEDDED_SNAPS_PATH}/bip32-example-snap/images/icon.svg`,
        ),
      },
      {
        path: 'dist/bundle.js',
        value: fs.readFileSync(
          `${EMBEDDED_SNAPS_PATH}/bip32-example-snap/dist/bundle.js`,
        ),
      },
    ],
  ),
]);

async function getPreinstalledSnap(
  npmPackage: string,
  manifest: string,
  files: { path: string; value: Buffer }[],
) {
  try {
    if (!manifest.includes(npmPackage)) {
      return;
    }

    return {
      snapId: `npm:${npmPackage}`,
      manifest: JSON.parse(manifest),
      files,
      removable: false,
    };
  } catch (error) {
    Logger.log('getPreinstalledSnap error', error);
    return;
  }
}

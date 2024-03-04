/* eslint-disable import/prefer-default-export */
import Logger from '../../util/Logger';
import RNFetchBlob from 'rn-fetch-blob';

export const PREINSTALLED_SNAPS = Object([
  'npm:@metamask/bip32-example-snap',
  getPreinstalledSnap(
    '@metamask/bip32-example-snap',
    '@metamask/bip32-example-snap/snap.manifest.json',
    [
      {
        path: 'images/icon.svg',
        value: Buffer.from('@metamask/bip32-example-snap/images/icon.svg'),
      },
      {
        path: 'dist/bundle.js',
        value: Buffer.from('@metamask/bip32-example-snap/dist/bundle.js'),
      },
    ],
  ),
]);

async function getPreinstalledSnap(
  npmPackage: string,
  manifestPath: string,
  files: { path: string; value: Buffer }[],
) {
  try {
    if (!manifestPath.includes(npmPackage)) {
      return;
    }

    const manifest = await RNFetchBlob.fs.readFile(
      require.resolve(manifestPath),
      'utf8',
    );

    const artifacts = await Promise.all(
      files.map(async ({ path, value }) => {
        const data = await RNFetchBlob.fs.readFile(value.toString(), 'base64');
        return { path, data };
      }),
    );

    return {
      snapId: `npm:${npmPackage}`,
      manifest: JSON.parse(manifest),
      files: artifacts,
      removable: false,
    };
  } catch (error) {
    Logger.log('getPreinstalledSnap error', error);
    return;
  }
}

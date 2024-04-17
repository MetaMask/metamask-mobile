import getPreinstalledSnap from './index';

/* eslint-disable @typescript-eslint/ban-ts-comment */
//@ts-ignore
import bundleJs from '../../../../node_modules/@metamask/bip32-example-snap/dist/bundle.js';
import manifestJson from '../../../../node_modules/@metamask/bip32-example-snap/snap.manifest.json';

describe('getPreinstalledSnap function', () => {
  it('should return the correct preinstalled @metamask/bip32-example-snap', () => {
    const snapName = '@metamask/bip32-example-snap';
    const manifest = JSON.stringify(manifestJson);
    const resources = [
      {
        path: 'images/icon.svg',
        value: 'icon',
      },
      {
        path: 'dist/bundle.js',
        value: JSON.stringify(bundleJs),
      },
    ];
    const expectedOutput = {
      files: [
        { path: 'images/icon.svg', value: 'icon' },
        { path: 'dist/bundle.js', value: undefined },
      ],
      manifest: {
        description:
          'MetaMask example snap demonstrating the use of `snap_getBip32Entropy`.',
        initialPermissions: {
          'endowment:rpc': { dapps: true, snaps: true },
          snap_dialog: {},
          snap_getBip32Entropy: [
            { curve: 'secp256k1', path: ['m', "44'", "0'"] },
            { curve: 'ed25519', path: ['m', "44'", "0'"] },
          ],
          snap_getBip32PublicKey: [
            { curve: 'secp256k1', path: ['m', "44'", "0'"] },
          ],
        },
        manifestVersion: '0.1',
        proposedName: 'BIP-32 Example Snap',
        repository: {
          type: 'git',
          url: 'https://github.com/MetaMask/snaps.git',
        },
        source: {
          location: {
            npm: {
              filePath: 'dist/bundle.js',
              packageName: '@metamask/bip32-example-snap',
              registry: 'https://registry.npmjs.org',
            },
          },
          shasum: 'NVydltk67wE3e1uAxlmal62P2EcP+cMfsNZ66EyJ7O4=',
        },
        version: '2.1.2',
      },
      removable: false,
      snapId: 'npm:@metamask/bip32-example-snap',
    };

    const result = getPreinstalledSnap(snapName, manifest, resources);

    expect(result).toStrictEqual(expectedOutput);
  });
});

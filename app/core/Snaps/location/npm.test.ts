import { NpmLocation } from './npm';

jest.mock('react-native-blob-util', () => ({
  config: jest.fn(() => ({
    fetch: jest.fn(() => ({
      flush: jest.fn(),
      data: '/document-dir/archive.tgz',
    })),
  })),
  fs: {
    dirs: { DocumentDir: '/document-dir/' },
    unlink: jest.fn().mockResolvedValue(undefined),
    isDir: jest.fn((path) => path.endsWith('archive') || path.endsWith('dist')),
    ls: jest.fn((path) => {
      if (path === '/document-dir/archive') {
        return ['snap.manifest.json', 'dist'];
      } else if (path === '/document-dir/archive/dist') {
        return ['bundle.js'];
      }
      return [];
    }),
    readFile: jest.fn((path) => {
      if (path === '/document-dir/archive/dist/bundle.js') {
        return `module.exports.onRpcRequest = () => null`;
      } else if (path === '/document-dir/archive/snap.manifest.json') {
        return `{ "proposedName": "Example Snap" }`;
      }
      throw new Error('File not found');
    }),
  },
}));

describe('NpmLocation', () => {
  // This test is heavily mocked and not necesarily a good indicator that everything works E2E.
  it('fetches and unpacks tarballs', async () => {
    const location = new NpmLocation(new URL('npm:@metamask/example-snap'));
    const manifest = await location.fetch('snap.manifest.json');
    expect(manifest.path).toStrictEqual('snap.manifest.json');
    expect(manifest.toString()).toStrictEqual(
      `{ "proposedName": "Example Snap" }`,
    );

    const bundle = await location.fetch('dist/bundle.js');
    expect(bundle.path).toStrictEqual('dist/bundle.js');
    expect(bundle.toString()).toStrictEqual(
      `module.exports.onRpcRequest = () => null`,
    );
  }, 10000); // Increased timeout to 10 seconds
});

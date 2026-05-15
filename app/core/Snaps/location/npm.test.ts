import { NativeModules } from 'react-native';

// Mock the isE2E flag via a mutable variable so individual tests can toggle it.
let mockIsE2E = false;
jest.mock('../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2E;
  },
  getMockServerPortInApp: jest.fn(() => 8000),
}));

// eslint-disable-next-line import-x/first
import { NpmLocation } from './npm';

// Mock RNTar native module before anything else
NativeModules.RNTar = {
  unTar: jest.fn().mockResolvedValue('/document-dir/archive'),
};

const mockBlobFetch = jest.fn((..._args: unknown[]) =>
  Promise.resolve({
    flush: jest.fn(),
    data: '/document-dir/archive.tgz',
    respInfo: {
      status: 200,
      headers: {
        'content-length': '2000',
      },
    },
  }),
);

jest.mock('react-native-blob-util', () => ({
  config: jest.fn(() => ({
    fetch: mockBlobFetch,
  })),
  fs: {
    unlink: jest.fn().mockResolvedValue(undefined),
    isDir: jest.fn((path) =>
      Promise.resolve(path.endsWith('archive') || path.endsWith('dist')),
    ),
    ls: jest.fn((path) => {
      if (path === '/document-dir/archive') {
        return Promise.resolve(['snap.manifest.json', 'dist']);
      } else if (path === '/document-dir/archive/dist') {
        return Promise.resolve(['bundle.js']);
      }
      return Promise.resolve([]);
    }),
    readFile: jest.fn((path) => {
      if (path === '/document-dir/archive/dist/bundle.js') {
        return Promise.resolve(`module.exports.onRpcRequest = () => null`);
      } else if (path === '/document-dir/archive/snap.manifest.json') {
        return Promise.resolve(`{ "proposedName": "Example Snap" }`);
      }
      return Promise.reject(new Error('File not found'));
    }),
  },
}));

describe('NpmLocation', () => {
  beforeEach(() => {
    mockBlobFetch.mockClear();
    mockIsE2E = false;
  });

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
  });

  describe('E2E URL rewriting', () => {
    it('routes tarball downloads to MockServerE2E /proxy when isE2E is true', async () => {
      mockIsE2E = true;

      const location = new NpmLocation(new URL('npm:@metamask/example-snap'));
      await location.fetch('snap.manifest.json');

      expect(mockBlobFetch).toHaveBeenCalledWith(
        'GET',
        expect.stringMatching(
          /^http:\/\/localhost:8000\/proxy\?url=https%3A%2F%2Fregistry\.npmjs\.org%2F/,
        ),
      );
    });

    it('uses the original tarball URL when isE2E is false', async () => {
      mockIsE2E = false;

      const location = new NpmLocation(new URL('npm:@metamask/example-snap'));
      await location.fetch('snap.manifest.json');

      expect(mockBlobFetch).toHaveBeenCalledWith(
        'GET',
        expect.stringMatching(/^https:\/\/registry\.npmjs\.org\//),
      );
    });
  });
});

import {
  rewriteBlobUtilUrl,
  patchReactNativeBlobUtilForE2E,
} from './blobUtilShim';

describe('rewriteBlobUtilUrl', () => {
  it('routes https URLs through the proxy', () => {
    expect(rewriteBlobUtilUrl('https://registry.npmjs.org/foo.tgz', 8000)).toBe(
      'http://localhost:8000/proxy?url=https%3A%2F%2Fregistry.npmjs.org%2Ffoo.tgz',
    );
  });

  it('routes http URLs through the proxy', () => {
    expect(rewriteBlobUtilUrl('http://example.com/bar', 8000)).toBe(
      'http://localhost:8000/proxy?url=http%3A%2F%2Fexample.com%2Fbar',
    );
  });

  it('leaves file:// URIs unchanged', () => {
    expect(rewriteBlobUtilUrl('file:///tmp/x', 8000)).toBe('file:///tmp/x');
  });

  it('leaves content:// URIs unchanged', () => {
    expect(rewriteBlobUtilUrl('content://media/external/x', 8000)).toBe(
      'content://media/external/x',
    );
  });

  it("leaves react-native-blob-util's prefixed file URIs unchanged", () => {
    expect(rewriteBlobUtilUrl('ReactNativeBlobUtil-file:///tmp/x', 8000)).toBe(
      'ReactNativeBlobUtil-file:///tmp/x',
    );
  });

  it('does not double-proxy URLs already pointing at the mock server', () => {
    const already = 'http://localhost:8000/proxy?url=https%3A%2F%2Ffoo.com';
    expect(rewriteBlobUtilUrl(already, 8000)).toBe(already);
  });

  it('passes through non-string inputs unchanged', () => {
    expect(rewriteBlobUtilUrl(undefined, 8000)).toBe(undefined);
    expect(rewriteBlobUtilUrl(null, 8000)).toBe(null);
    expect(rewriteBlobUtilUrl(42, 8000)).toBe(42);
  });

  it('honors a custom host (e.g. Android emulator 10.0.2.2)', () => {
    expect(rewriteBlobUtilUrl('https://foo.com/x', 8000, '10.0.2.2')).toBe(
      'http://10.0.2.2:8000/proxy?url=https%3A%2F%2Ffoo.com%2Fx',
    );
  });
});

describe('patchReactNativeBlobUtilForE2E', () => {
  it('rewrites URLs passed to the top-level fetch()', async () => {
    const nativeFetch = jest.fn().mockResolvedValue({ status: 200 });
    const moduleObj = { fetch: nativeFetch, config: jest.fn() };

    patchReactNativeBlobUtilForE2E(moduleObj, 8000);

    await moduleObj.fetch('GET', 'https://registry.npmjs.org/foo.tgz', {
      Accept: '*/*',
    });

    expect(nativeFetch).toHaveBeenCalledWith(
      'GET',
      'http://localhost:8000/proxy?url=https%3A%2F%2Fregistry.npmjs.org%2Ffoo.tgz',
      { Accept: '*/*' },
    );
  });

  it('rewrites URLs passed to config(...).fetch() — the npm.ts pattern', async () => {
    const nativeFetch = jest.fn().mockResolvedValue({ status: 200 });
    const originalConfig = jest.fn(() => ({ fetch: nativeFetch }));
    const moduleObj = { fetch: jest.fn(), config: originalConfig };

    patchReactNativeBlobUtilForE2E(moduleObj, 8000);

    const { fetch: configuredFetch } = moduleObj.config({
      fileCache: true,
      appendExt: 'tgz',
    });
    await configuredFetch('GET', 'https://github.io/snap.tgz');

    expect(originalConfig).toHaveBeenCalledWith({
      fileCache: true,
      appendExt: 'tgz',
    });
    expect(nativeFetch).toHaveBeenCalledWith(
      'GET',
      'http://localhost:8000/proxy?url=https%3A%2F%2Fgithub.io%2Fsnap.tgz',
    );
  });

  it('is idempotent — calling patch twice does not double-wrap', async () => {
    const nativeFetch = jest.fn().mockResolvedValue({});
    const moduleObj = {
      fetch: nativeFetch,
      config: jest.fn(() => ({ fetch: nativeFetch })),
    };

    patchReactNativeBlobUtilForE2E(moduleObj, 8000);
    patchReactNativeBlobUtilForE2E(moduleObj, 8000);

    await moduleObj.fetch('GET', 'https://x.com');
    expect(nativeFetch).toHaveBeenCalledTimes(1);
    expect(nativeFetch).toHaveBeenCalledWith(
      'GET',
      'http://localhost:8000/proxy?url=https%3A%2F%2Fx.com',
    );
  });

  it('leaves file URIs untouched (file fetch path stays native)', async () => {
    const nativeFetch = jest.fn().mockResolvedValue({});
    const moduleObj = { fetch: nativeFetch, config: jest.fn() };

    patchReactNativeBlobUtilForE2E(moduleObj, 8000);

    await moduleObj.fetch('GET', 'ReactNativeBlobUtil-file:///tmp/x');
    expect(nativeFetch).toHaveBeenCalledWith(
      'GET',
      'ReactNativeBlobUtil-file:///tmp/x',
    );
  });

  it('honors a custom host when wiring the patch', async () => {
    const nativeFetch = jest.fn().mockResolvedValue({});
    const moduleObj = { fetch: nativeFetch, config: jest.fn() };

    patchReactNativeBlobUtilForE2E(moduleObj, 8000, '10.0.2.2');

    await moduleObj.fetch('GET', 'https://foo.com/x');
    expect(nativeFetch).toHaveBeenCalledWith(
      'GET',
      'http://10.0.2.2:8000/proxy?url=https%3A%2F%2Ffoo.com%2Fx',
    );
  });

  it('proves the real npm.ts call path is covered (config + destructure + fetch)', async () => {
    // Mirrors app/core/Snaps/location/npm.ts:38-53 exactly.
    const calls = [];
    const fakeBlobUtil = {
      fetch: () => {
        throw new Error('top-level fetch should not be hit in this path');
      },
      config(options) {
        calls.push({ kind: 'config', options });
        return {
          fetch: (method, url) => {
            calls.push({ kind: 'configured-fetch', method, url });
            return Promise.resolve({
              respInfo: {
                status: 200,
                headers: { 'content-length': '12345' },
              },
              data: '/tmp/cached.tgz',
              flush: () => {
                /* no-op: mirrors FetchBlobResponse.flush in npm.ts */
              },
            });
          },
        };
      },
    };

    patchReactNativeBlobUtilForE2E(fakeBlobUtil, 8000);

    const { fetch: blobFetch } = fakeBlobUtil.config({
      fileCache: true,
      appendExt: 'tgz',
    });
    const tarballUrl = new URL('https://github.io/snaps/some-snap-1.0.0.tgz');
    const response = await blobFetch('GET', tarballUrl.toString());

    expect(calls).toEqual([
      { kind: 'config', options: { fileCache: true, appendExt: 'tgz' } },
      {
        kind: 'configured-fetch',
        method: 'GET',
        url: 'http://localhost:8000/proxy?url=https%3A%2F%2Fgithub.io%2Fsnaps%2Fsome-snap-1.0.0.tgz',
      },
    ]);
    expect(response.respInfo.status).toBe(200);
    expect(response.respInfo.headers['content-length']).toBe('12345');
  });
});

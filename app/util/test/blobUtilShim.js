// Routes react-native-blob-util's JS-side fetch through the MockServerE2E
// /proxy?url=… endpoint in E2E builds, so snap tarball downloads (npm.ts)
// and other native blob-util traffic become visible to the mock server
// without OS-level proxying or CA cert installation.

const REWRITABLE_PROTOCOL_REGEX = /^https?:\/\//i;

export function rewriteBlobUtilUrl(
  url,
  mockServerPort,
  mockServerHost = 'localhost',
) {
  if (typeof url !== 'string') {
    return url;
  }
  if (!REWRITABLE_PROTOCOL_REGEX.test(url)) {
    return url;
  }
  const mockServerOrigin = `http://${mockServerHost}:${mockServerPort}`;
  if (url.startsWith(mockServerOrigin)) {
    return url;
  }
  return `${mockServerOrigin}/proxy?url=${encodeURIComponent(url)}`;
}

export function patchReactNativeBlobUtilForE2E(
  blobUtilModule,
  mockServerPort,
  mockServerHost = 'localhost',
) {
  if (!blobUtilModule || blobUtilModule.__e2eBlobUtilPatched) {
    return;
  }

  const originalFetch = blobUtilModule.fetch;
  if (typeof originalFetch === 'function') {
    blobUtilModule.fetch = function patchedFetch(method, url, ...rest) {
      return originalFetch.call(
        this,
        method,
        rewriteBlobUtilUrl(url, mockServerPort, mockServerHost),
        ...rest,
      );
    };
  }

  const originalConfig = blobUtilModule.config;
  if (typeof originalConfig === 'function') {
    blobUtilModule.config = function patchedConfig(options) {
      const result = originalConfig.call(this, options);
      if (result && typeof result.fetch === 'function') {
        const innerFetch = result.fetch;
        result.fetch = function patchedConfiguredFetch(method, url, ...rest) {
          return innerFetch.call(
            this,
            method,
            rewriteBlobUtilUrl(url, mockServerPort, mockServerHost),
            ...rest,
          );
        };
      }
      return result;
    };
  }

  Object.defineProperty(blobUtilModule, '__e2eBlobUtilPatched', {
    value: true,
    enumerable: false,
  });
}

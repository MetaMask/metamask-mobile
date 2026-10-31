interface NativeRequest {
  headers?: { key: string; value: string }[];
}

const mockNativeRequest = jest.fn(async (_request: NativeRequest) => ({
  url: 'https://example.com',
  status: 200,
  statusText: 'OK',
  ok: true,
  redirected: false,
  headers: [],
  bodyString: '',
}));

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    box: <Value>(value: Value) => value,
    createHybridObject: (name: string) =>
      name === 'NitroFetch'
        ? {
            createClient: () => ({ request: mockNativeRequest }),
          }
        : {},
  },
}));

// Guards the resolveTextDecoder patch hunk: nitro-fetch must never require the
// optional 'react-native-nitro-text-decoder' module. Under Metro production
// bundles that require is unresolvable (it is hidden from Metro's dependency
// collector by an aliased require), and Metro's guardedLoadModule reports the
// resulting "Requiring unknown module" error via ErrorUtils.reportFatalError
// instead of rethrowing — a fatal crash the library's own try/catch cannot
// intercept. See the patch in
// .yarn/patches/react-native-nitro-fetch-npm-1.5.1-a04fdec326.patch
const mockRequireNitroTextDecoder = jest.fn(() => {
  throw new Error('Requiring unknown module "react-native-nitro-text-decoder"');
});
jest.mock('react-native-nitro-text-decoder', () =>
  mockRequireNitroTextDecoder(),
);

describe('react-native-nitro-fetch dependency patch', () => {
  let headersDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    headersDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Headers');
    mockNativeRequest.mockClear();
  });

  afterEach(() => {
    if (headersDescriptor) {
      Object.defineProperty(globalThis, 'Headers', headersDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'Headers');
    }
  });

  it('passes record headers to the native request when global Headers is unavailable', async () => {
    Object.defineProperty(globalThis, 'Headers', {
      configurable: true,
      value: undefined,
    });
    let dependencyFetch:
      | typeof import('react-native-nitro-fetch').fetch
      | undefined;

    await jest.isolateModulesAsync(async () => {
      dependencyFetch = (await import('react-native-nitro-fetch')).fetch;
    });

    await dependencyFetch?.('https://example.com', {
      headers: { Authorization: 'Bearer test' },
    });

    const [nativeRequest] = mockNativeRequest.mock.calls[0];
    expect(nativeRequest.headers).toEqual([
      { key: 'Authorization', value: 'Bearer test' },
    ]);
  });

  it('decodes data: URLs with the global TextDecoder without requiring react-native-nitro-text-decoder', async () => {
    let dependencyFetch:
      | typeof import('react-native-nitro-fetch').fetch
      | undefined;

    await jest.isolateModulesAsync(async () => {
      dependencyFetch = (await import('react-native-nitro-fetch')).fetch;
    });

    // 'aGVsbG8gd29ybGQ=' is base64 for 'hello world' — forces the
    // decodeDataUrl -> decodeUtf8 -> resolveTextDecoder path that crashed
    // in production (Sentry: 'Requiring unknown module
    // "react-native-nitro-text-decoder"').
    const response = await dependencyFetch?.(
      'data:text/plain;base64,aGVsbG8gd29ybGQ=',
    );

    expect(response?.status).toBe(200);
    await expect(response?.text()).resolves.toBe('hello world');
    expect(mockRequireNitroTextDecoder).not.toHaveBeenCalled();
  });
});

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
});

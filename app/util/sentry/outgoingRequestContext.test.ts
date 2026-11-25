import {
  getActiveSpan,
  startSpan,
  type Span,
  type SpanJSON,
} from '@sentry/core';
import { getNetworkConditions } from '../deviceCapability/conditions';
import NetInfo from '@react-native-community/netinfo';
import NavigationService from '../../core/NavigationService';
import {
  OUTGOING_REQUEST_CONNECTION_ATTRIBUTE,
  OUTGOING_REQUEST_ROUTE_ATTRIBUTE,
  annotateOutgoingRequestSpan,
  installStandaloneOutgoingFetchSpan,
  redactOutgoingRequestSpan,
  registerOutgoingRequestAnnotation,
  resetOutgoingRequestAnnotationForTesting,
} from './outgoingRequestContext';

jest.mock('@sentry/core', () => ({
  getActiveSpan: jest.fn(),
  startSpan: jest.fn((_options: unknown, callback: (span: Span) => unknown) =>
    callback({ setAttribute: jest.fn() } as unknown as Span),
  ),
}));

jest.mock('../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    getCurrentRoute: jest.fn(() => ({ name: 'WalletView' })),
  },
}));

jest.mock('../deviceCapability/conditions', () => ({
  getNetworkConditions: jest.fn(() => ({
    hardware: null,
    network: null,
    latency: 'UNKNOWN',
  })),
}));

let mockNetInfoLoad: 'available' | 'missing' | 'throws' = 'available';

jest.mock('@react-native-community/netinfo', () => {
  const netInfo = {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ type: 'unknown' })),
  };
  return {
    __esModule: true,
    get default() {
      if (mockNetInfoLoad === 'throws') {
        throw new Error('native module unavailable');
      }
      return mockNetInfoLoad === 'missing' ? undefined : netInfo;
    },
  };
});

const mockedGetCurrentRoute = jest.mocked(NavigationService.getCurrentRoute);
const mockedAddEventListener = jest.mocked(NetInfo.addEventListener);
const mockedGetActiveSpan = jest.mocked(getActiveSpan);
const mockedStartSpan = jest.mocked(startSpan);

function createSpan(): Span & { setAttribute: jest.Mock } {
  return {
    setAttribute: jest.fn(),
  } as unknown as Span & { setAttribute: jest.Mock };
}

describe('redactOutgoingRequestSpan', () => {
  it('keeps only safe HTTP dimensions and removes SDK request details', () => {
    const sensitiveUrl = 'https://example.com/private?account=secret';
    const span: SpanJSON = {
      trace_id: 'trace',
      span_id: 'span',
      start_timestamp: 1,
      timestamp: 2,
      op: 'http.client',
      description: `POST ${sensitiveUrl}`,
      data: {
        url: sensitiveUrl,
        'url.full': sensitiveUrl,
        'http.url': sensitiveUrl,
        'http.query': 'account=secret',
        'http.target': '/private',
        'http.request.header.authorization': 'Bearer secret',
        'http.request.body': 'secret',
        'http.method': 'POST',
        'http.status_code': 201,
        'hardware.tier': 'MID',
      },
    };

    const result = redactOutgoingRequestSpan(span);

    expect(result.description).toBe('POST');
    expect(JSON.parse(JSON.stringify(result.data))).toEqual({
      'http.method': 'POST',
      'http.status_code': 201,
      'hardware.tier': 'MID',
    });
  });
});

describe('annotateOutgoingRequestSpan', () => {
  it('sets route and connection type when each is present', () => {
    const span = createSpan();

    annotateOutgoingRequestSpan(span, {
      routeName: 'WalletView',
      connectionType: 'cellular',
    });

    expect(span.setAttribute).toHaveBeenCalledWith(
      OUTGOING_REQUEST_ROUTE_ATTRIBUTE,
      'WalletView',
    );
    expect(span.setAttribute).toHaveBeenCalledWith(
      OUTGOING_REQUEST_CONNECTION_ATTRIBUTE,
      'cellular',
    );
  });

  it('skips attributes that were not captured', () => {
    const span = createSpan();

    annotateOutgoingRequestSpan(span, {});

    expect(span.setAttribute).not.toHaveBeenCalled();
  });
});

describe('registerOutgoingRequestAnnotation', () => {
  beforeEach(() => {
    resetOutgoingRequestAnnotationForTesting();
    mockedGetCurrentRoute.mockReturnValue({
      key: 'WalletView-key',
      name: 'WalletView',
    });
    mockedAddEventListener.mockClear();
  });

  it('writes the focused route and connection type when a request span starts', () => {
    const span = createSpan();
    let onRequest: ((requestSpan: Span) => void) | undefined;
    const client = {
      on: jest.fn(
        (
          _hook: 'beforeOutgoingRequestSpan',
          callback: (requestSpan: Span) => void,
        ) => {
          onRequest = callback;
          return jest.fn();
        },
      ),
    };

    registerOutgoingRequestAnnotation(client);
    const listener = mockedAddEventListener.mock.calls[0][0] as (state: {
      type: string;
    }) => void;
    listener({ type: 'cellular' });

    onRequest?.(span);

    expect(client.on).toHaveBeenCalledWith(
      'beforeOutgoingRequestSpan',
      expect.any(Function),
    );
    expect(span.setAttribute).toHaveBeenCalledWith(
      OUTGOING_REQUEST_ROUTE_ATTRIBUTE,
      'WalletView',
    );
    expect(span.setAttribute).toHaveBeenCalledWith(
      OUTGOING_REQUEST_CONNECTION_ATTRIBUTE,
      'cellular',
    );
  });

  it('reads tier attributes at request start, including unknown tiers', () => {
    const span = createSpan();
    const client = {
      on: jest.fn((_hook, _callback: (value: Span) => void) => jest.fn()),
    };
    registerOutgoingRequestAnnotation(client);
    const [, onRequest] = client.on.mock.calls[0];
    jest.mocked(getNetworkConditions).mockReturnValueOnce({
      hardware: 'LOW',
      network: 'SLOW_CELLULAR',
      latency: 'SLOW',
    });

    onRequest(span);
    onRequest(span);

    expect(span.setAttribute).toHaveBeenCalledWith('hardware.tier', 'LOW');
    expect(span.setAttribute).toHaveBeenCalledWith(
      'network.tier',
      'SLOW_CELLULAR',
    );
    expect(span.setAttribute).toHaveBeenCalledWith('latency.bucket', 'SLOW');
    expect(span.setAttribute).toHaveBeenCalledWith('hardware.tier', 'UNKNOWN');
    expect(span.setAttribute).toHaveBeenCalledWith('network.tier', 'UNKNOWN');
    expect(span.setAttribute).toHaveBeenCalledWith('latency.bucket', 'UNKNOWN');
  });

  it('leaves connection type unset when NetInfo is still unknown', () => {
    const span = createSpan();
    let onRequest: ((requestSpan: Span) => void) | undefined;
    const client = {
      on: jest.fn(
        (
          _hook: 'beforeOutgoingRequestSpan',
          callback: (requestSpan: Span) => void,
        ) => {
          onRequest = callback;
          return jest.fn();
        },
      ),
    };

    registerOutgoingRequestAnnotation(client);
    const listener = mockedAddEventListener.mock.calls[0][0] as (state: {
      type: string;
    }) => void;
    listener({ type: 'unknown' });

    onRequest?.(span);

    expect(span.setAttribute).not.toHaveBeenCalledWith(
      OUTGOING_REQUEST_CONNECTION_ATTRIBUTE,
      expect.anything(),
    );
  });

  it('subscribes the client once', () => {
    const client = {
      on: jest.fn(() => jest.fn()),
    };

    registerOutgoingRequestAnnotation(client);
    registerOutgoingRequestAnnotation(client);

    expect(client.on).toHaveBeenCalledTimes(1);
  });
});

describe('installStandaloneOutgoingFetchSpan', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetOutgoingRequestAnnotationForTesting();
    mockedGetActiveSpan.mockReset();
    mockedStartSpan.mockClear();
    mockedGetCurrentRoute.mockReturnValue({
      key: 'WalletView-key',
      name: 'WalletView',
    });
  });

  afterEach(() => {
    resetOutgoingRequestAnnotationForTesting();
    global.fetch = originalFetch;
  });

  it('calls fetch directly when a span is already active', async () => {
    const response = Promise.resolve(new Response(null));
    const innerFetch = jest.fn(() => response);
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue({} as Span);

    installStandaloneOutgoingFetchSpan();
    const result = global.fetch('https://example.com/price');

    expect(result).toBe(response);
    expect(innerFetch).toHaveBeenCalledWith(
      'https://example.com/price',
      undefined,
    );
    expect(mockedStartSpan).not.toHaveBeenCalled();
  });

  it('opens a root span for a fetch that has no active span', () => {
    const response = Promise.resolve(new Response(null));
    const innerFetch = jest.fn(() => response);
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue(undefined);
    const span = createSpan();
    mockedStartSpan.mockImplementation((_options, callback) => callback(span));

    installStandaloneOutgoingFetchSpan();
    const result = global.fetch('https://example.com/price', {
      method: 'post',
    });

    expect(result).toBe(response);
    expect(mockedStartSpan).toHaveBeenCalledWith(
      {
        name: 'POST',
        op: 'http.request',
      },
      expect.any(Function),
    );
    expect(span.setAttribute).toHaveBeenCalledWith(
      OUTGOING_REQUEST_ROUTE_ATTRIBUTE,
      'WalletView',
    );
    expect(innerFetch).toHaveBeenCalledWith('https://example.com/price', {
      method: 'post',
    });
  });

  it('wraps fetch once', () => {
    const innerFetch = jest.fn(() => Promise.resolve(new Response(null)));
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue(undefined);

    installStandaloneOutgoingFetchSpan();
    const wrapped = global.fetch;
    installStandaloneOutgoingFetchSpan();

    expect(global.fetch).toBe(wrapped);
  });

  it('falls back to plain fetch when the root span cannot start', () => {
    const response = Promise.resolve(new Response(null));
    const innerFetch = jest.fn(() => response);
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue(undefined);
    mockedStartSpan.mockImplementationOnce(() => {
      throw new Error('span unavailable');
    });

    installStandaloneOutgoingFetchSpan();
    const result = global.fetch('https://example.com/price');

    expect(result).toBe(response);
    expect(innerFetch).toHaveBeenCalledWith(
      'https://example.com/price',
      undefined,
    );
  });

  it('names the root span from a URL object', () => {
    const innerFetch = jest.fn(() => Promise.resolve(new Response(null)));
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue(undefined);

    installStandaloneOutgoingFetchSpan();
    global.fetch(new URL('https://example.com/price'));

    expect(mockedStartSpan).toHaveBeenCalledWith(
      {
        name: 'GET',
        op: 'http.request',
      },
      expect.any(Function),
    );
  });

  it('takes the method and URL from a Request input', () => {
    const innerFetch = jest.fn(() => Promise.resolve(new Response(null)));
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue(undefined);
    const request = new Request('https://example.com/quote', {
      method: 'put',
    });

    installStandaloneOutgoingFetchSpan();
    global.fetch(request);

    expect(mockedStartSpan).toHaveBeenCalledWith(
      {
        name: 'PUT',
        op: 'http.request',
      },
      expect.any(Function),
    );
  });

  it('names the root span by method alone when the input has no URL', () => {
    const innerFetch = jest.fn(() => Promise.resolve(new Response(null)));
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue(undefined);

    installStandaloneOutgoingFetchSpan();
    global.fetch(undefined as unknown as RequestInfo);

    expect(mockedStartSpan).toHaveBeenCalledWith(
      {
        name: 'GET',
        op: 'http.request',
      },
      expect.any(Function),
    );
  });

  it('omits the route when the navigation service throws', () => {
    const innerFetch = jest.fn(() => Promise.resolve(new Response(null)));
    global.fetch = innerFetch as typeof fetch;
    mockedGetActiveSpan.mockReturnValue(undefined);
    const span = createSpan();
    mockedStartSpan.mockImplementation((_options, callback) => callback(span));
    mockedGetCurrentRoute.mockImplementationOnce(() => {
      throw new Error('navigation not ready');
    });

    installStandaloneOutgoingFetchSpan();
    global.fetch('https://example.com/price');

    expect(span.setAttribute).not.toHaveBeenCalledWith(
      OUTGOING_REQUEST_ROUTE_ATTRIBUTE,
      expect.anything(),
    );
    expect(innerFetch).toHaveBeenCalledTimes(1);
  });
});

describe('registerOutgoingRequestAnnotation connection listener', () => {
  beforeEach(() => {
    resetOutgoingRequestAnnotationForTesting();
    mockedAddEventListener.mockClear();
  });

  it('starts one NetInfo listener across clients', () => {
    const firstClient = { on: jest.fn(() => jest.fn()) };
    const secondClient = { on: jest.fn(() => jest.fn()) };

    registerOutgoingRequestAnnotation(firstClient);
    registerOutgoingRequestAnnotation(secondClient);

    expect(mockedAddEventListener).toHaveBeenCalledTimes(1);
    expect(secondClient.on).toHaveBeenCalledWith(
      'beforeOutgoingRequestSpan',
      expect.any(Function),
    );
  });

  it('ignores a NetInfo fetch failure', async () => {
    const netInfoFetch = jest.mocked(NetInfo.fetch);
    netInfoFetch.mockImplementationOnce(() =>
      Promise.reject(new Error('offline')),
    );
    const client = { on: jest.fn(() => jest.fn()) };

    registerOutgoingRequestAnnotation(client);
    await new Promise((resolve) => setImmediate(resolve));

    expect(client.on).toHaveBeenCalledWith(
      'beforeOutgoingRequestSpan',
      expect.any(Function),
    );
  });
});

describe('registerOutgoingRequestAnnotation without NetInfo', () => {
  beforeEach(() => {
    resetOutgoingRequestAnnotationForTesting();
  });

  afterEach(() => {
    mockNetInfoLoad = 'available';
  });

  it.each(['missing', 'throws'] as const)(
    'omits the connection type when %s',
    (mode) => {
      mockNetInfoLoad = mode;
      const span = createSpan();
      let onRequest: ((requestSpan: Span) => void) | undefined;
      const client = {
        on: jest.fn(
          (
            _hook: 'beforeOutgoingRequestSpan',
            callback: (requestSpan: Span) => void,
          ) => {
            onRequest = callback;
            return jest.fn();
          },
        ),
      };

      registerOutgoingRequestAnnotation(client);
      onRequest?.(span);

      expect(client.on).toHaveBeenCalledTimes(1);
      expect(span.setAttribute).not.toHaveBeenCalledWith(
        OUTGOING_REQUEST_CONNECTION_ATTRIBUTE,
        expect.anything(),
      );
    },
  );
});

import { getActiveSpan, startSpan, type Span } from '@sentry/core';
import NetInfo from '@react-native-community/netinfo';
import NavigationService from '../../core/NavigationService';
import {
  OUTGOING_REQUEST_CONNECTION_ATTRIBUTE,
  OUTGOING_REQUEST_ROUTE_ATTRIBUTE,
  annotateOutgoingRequestSpan,
  installStandaloneOutgoingFetchSpan,
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

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ type: 'unknown' })),
  },
}));

const mockedGetCurrentRoute = jest.mocked(NavigationService.getCurrentRoute);
const mockedAddEventListener = jest.mocked(NetInfo.addEventListener);
const mockedGetActiveSpan = jest.mocked(getActiveSpan);
const mockedStartSpan = jest.mocked(startSpan);

function createSpan(): Span & { setAttribute: jest.Mock } {
  return {
    setAttribute: jest.fn(),
  } as unknown as Span & { setAttribute: jest.Mock };
}

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
        name: 'POST https://example.com/price',
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
});

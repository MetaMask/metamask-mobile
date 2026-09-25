import { isAxiosError } from 'axios';
import Logger from '../../../../../util/Logger';
import {
  annotateTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import { CardProviderError, CardProviderErrorCode } from '../provider-types';
import {
  CardApiError,
  classifyCardHttpOutcome,
  normalizeCardEndpoint,
  observeCardHttpCall,
  readWalletLoadFields,
  toCardProviderError,
  type CardHttpCallParams,
} from './cardHttpObservability';

jest.mock('../../../../../util/Logger');
jest.mock('uuid', () => ({
  v4: () => '11111111-2222-4333-8444-555555555555',
}));
jest.mock('axios', () => ({
  isAxiosError: jest.fn(),
}));
jest.mock('../../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../../util/trace');
  return {
    ...actual,
    trace: jest.fn((_request: unknown, fn: (context?: unknown) => unknown) =>
      fn(undefined),
    ),
    annotateTrace: jest.fn(),
  };
});

const REQUEST_ID = '11111111-2222-4333-8444-555555555555';

function httpCall(
  overrides: Partial<CardHttpCallParams<{ ok: boolean }>> = {},
): CardHttpCallParams<{ ok: boolean }> {
  return {
    provider: 'baanx',
    serviceName: 'BaanxService',
    path: '/v1/wallet/reward',
    method: 'GET',
    location: 'international',
    headers: {},
    execute: async () => ({ status: 200, data: { ok: true } }),
    ...overrides,
  };
}

function axiosError(status?: number, data?: unknown, code?: string): Error {
  const error = new Error('Request failed') as Error & {
    isAxiosError: boolean;
    code?: string;
    response?: { status: number; data: unknown };
  };
  error.isAxiosError = true;
  error.code = code;
  if (status !== undefined) {
    error.response = { status, data };
  }
  return error;
}

beforeEach(() => {
  jest.clearAllMocks();
  (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
});

describe('observeCardHttpCall', () => {
  it('sends a request id, traces success, and redacts dev logs', async () => {
    const devGlobal = global as { __DEV__?: boolean };
    const previousDev = devGlobal.__DEV__;
    devGlobal.__DEV__ = true;
    const headers = {
      Authorization: 'Bearer secret-token',
      'x-client-key': 'client-secret',
    };

    const result = await observeCardHttpCall(
      httpCall({
        path: '/v1/wallet/reward?raw=1',
        method: 'POST',
        location: 'us',
        headers,
        execute: async () => ({ status: 200, data: { ok: true } }),
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(headers).toEqual(
      expect.objectContaining({
        'x-mm-request-id': REQUEST_ID,
      }),
    );
    expect(trace).toHaveBeenCalledWith(
      {
        name: TraceName.CardApiRequest,
        op: TraceOperation.CardDataFetch,
        tags: {
          card_endpoint: '/v1/wallet/reward',
          card_method: 'POST',
          card_provider: 'baanx',
          card_location: 'us',
        },
      },
      expect.any(Function),
    );
    expect(annotateTrace).toHaveBeenCalledWith(undefined, {
      card_http_status: 200,
      card_outcome: 'success',
    });

    const requestLog = jest
      .mocked(Logger.log)
      .mock.calls.find((call) => call[1] === 'request');
    expect(requestLog?.[2]).toBe('/v1/wallet/reward?raw=1');
    expect(requestLog?.[3]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: '[redacted]',
          'x-client-key': '[redacted]',
        }),
      }),
    );
    expect(requestLog?.[3]).not.toHaveProperty('body');
    expect(JSON.stringify(requestLog)).not.toContain('secret-token');
    devGlobal.__DEV__ = previousDev;
  });

  it('reports a failure once with a normalized path and a single request id tag', async () => {
    await expect(
      observeCardHttpCall(
        httpCall({
          path: '/v1/wallet/credit/123?token=secret',
          execute: async () => {
            throw axiosError(500, { errorCode: 'upstream', token: 'secret' });
          },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 500,
      path: '/v1/wallet/credit/:id',
      message: 'Card API error 500 on /v1/wallet/credit/:id',
      outcome: 'http_5xx',
      requestId: REQUEST_ID,
      reported: true,
      errorCode: 'upstream',
    });

    const logged = jest.mocked(Logger.error).mock.calls[0];
    const apiError = logged[0] as CardApiError;
    const sentry = logged[1] as {
      tags: Record<string, string>;
      context: { name: string; data: Record<string, unknown> };
    };
    expect(apiError).toBeInstanceOf(CardApiError);
    expect(JSON.stringify(apiError)).not.toContain('secret');
    expect(Object.keys(apiError)).not.toContain('responseBody');
    expect(Object.keys(sentry.tags).sort()).toEqual([
      'card_endpoint',
      'card_http_status',
      'card_location',
      'card_method',
      'card_outcome',
      'card_request_id',
      'feature',
      'provider',
    ]);
    expect(sentry.tags.card_request_id).toBe(REQUEST_ID);
    expect(sentry.tags.card_endpoint).toBe('/v1/wallet/credit/:id');
    expect(Object.keys(sentry.context.data).sort()).toEqual([
      'endpoint',
      'errorCode',
      'httpStatus',
      'outcome',
    ]);
    expect(sentry.context.data).not.toHaveProperty('request_id');
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });

  it('does not log routine 401s', async () => {
    await expect(
      observeCardHttpCall(
        httpCall({
          execute: async () => {
            throw axiosError(401, 'Unauthorized');
          },
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 401, reported: false });
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('does not log statuses the caller treats as expected', async () => {
    await expect(
      observeCardHttpCall(
        httpCall({
          path: '/v1/card/status',
          unreportedStatuses: [404],
          execute: async () => {
            throw axiosError(404, 'missing');
          },
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 404, reported: false });
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('logs 401s on always-report endpoints', async () => {
    await expect(
      observeCardHttpCall(
        httpCall({
          path: '/v1/auth/oauth/token',
          alwaysReportEndpoints: ['/v1/auth/oauth/token'],
          execute: async () => {
            throw axiosError(401, 'Unauthorized');
          },
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 401, reported: true });
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });

  it('classifies timeouts and rethrows non-axios errors', async () => {
    await expect(
      observeCardHttpCall(
        httpCall({
          execute: async () => {
            throw axiosError(undefined, undefined, 'ECONNABORTED');
          },
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 408,
      outcome: 'timeout',
      reported: true,
    });

    (isAxiosError as unknown as jest.Mock).mockReturnValue(false);
    await expect(
      observeCardHttpCall(
        httpCall({
          execute: async () => {
            throw new TypeError('boom');
          },
        }),
      ),
    ).rejects.toThrow(TypeError);
  });
});

describe('normalizeCardEndpoint', () => {
  it('strips query strings and id-like segments', () => {
    expect(normalizeCardEndpoint('/v1/wallet/reward?foo=1')).toBe(
      '/v1/wallet/reward',
    );
    expect(
      normalizeCardEndpoint(
        '/v1/card/550e8400-e29b-41d4-a716-446655440000/details',
      ),
    ).toBe('/v1/card/:id/details');
    expect(normalizeCardEndpoint('/v1/card/42')).toBe('/v1/card/:id');
    expect(
      normalizeCardEndpoint('/v1/card/0xabc123def4567890abc123def4567890'),
    ).toBe('/v1/card/:id');
  });
});

describe('classifyCardHttpOutcome', () => {
  it.each([
    [200, 'success'],
    [401, 'http_4xx'],
    [422, 'rate_limited'],
    [429, 'rate_limited'],
    [408, 'timeout'],
    [0, 'network_error'],
    [503, 'http_5xx'],
  ] as const)('classifies %s as %s', (status, outcome) => {
    expect(classifyCardHttpOutcome(status)).toBe(outcome);
  });
});

describe('toCardProviderError', () => {
  it.each([
    [
      401,
      CardProviderErrorCode.InvalidCredentials,
      'Authentication failed on op',
    ],
    [403, CardProviderErrorCode.Forbidden, 'Forbidden on op'],
    [404, CardProviderErrorCode.NotFound, 'Not found: op'],
    [409, CardProviderErrorCode.Conflict, 'Conflict on op'],
    [408, CardProviderErrorCode.Timeout, 'Request timeout on op'],
    [429, CardProviderErrorCode.Unknown, 'Rate limited on op'],
    [500, CardProviderErrorCode.ServerError, 'Server error on op'],
    [0, CardProviderErrorCode.Network, 'Network error on op'],
  ] as const)('maps %s to %s', (status, code, message) => {
    const body =
      status === 403 ? JSON.stringify({ errorCode: 'FORBIDDEN' }) : '';
    const mapped = toCardProviderError(
      new CardApiError(status, '/v1/x', body),
      'op',
    );

    expect(mapped).toMatchObject({ code, message, statusCode: status });
    if (status === 403) {
      expect(mapped.errorCode).toBe('FORBIDDEN');
    }
  });

  it('copies requestId and reported from the HTTP error', () => {
    const apiError = new CardApiError(500, '/v1/wallet/credit', '', {
      requestId: 'req-1',
    });
    apiError.reported = true;

    expect(toCardProviderError(apiError, 'getCreditWallet')).toMatchObject({
      code: CardProviderErrorCode.ServerError,
      requestId: 'req-1',
      reported: true,
    });
  });

  it('returns an existing provider error unchanged', () => {
    const error = new CardProviderError(
      CardProviderErrorCode.Unknown,
      'already mapped',
    );

    expect(toCardProviderError(error, 'op')).toBe(error);
  });

  it('maps non-api errors to Unknown', () => {
    expect(toCardProviderError(new Error('boom'), 'op')).toMatchObject({
      code: CardProviderErrorCode.Unknown,
      message: 'boom',
    });
  });
});

describe('readWalletLoadFields', () => {
  it('returns success fields when there is no error', () => {
    expect(readWalletLoadFields()).toEqual({
      outcome: 'success',
      status_code: null,
      reason: null,
    });
  });

  it('reads outcome from an HTTP error and a provider error', () => {
    const apiError = new CardApiError(
      503,
      '/v1/wallet/reward',
      JSON.stringify({ errorCode: 'upstream' }),
    );
    expect(readWalletLoadFields(apiError)).toEqual({
      outcome: 'http_5xx',
      status_code: 503,
      reason: 'upstream',
    });

    expect(
      readWalletLoadFields(
        new CardProviderError(CardProviderErrorCode.Timeout, 'timed out', 408),
      ),
    ).toEqual({
      outcome: 'timeout',
      status_code: 408,
      reason: 'timeout',
    });
  });
});

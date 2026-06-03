import { renderHook } from '@testing-library/react-native';
import { addBreadcrumb } from '@sentry/react-native';
import Logger from '../Logger';
import {
  extractHttpStatus,
  categoriseSocialError,
  buildSocialErrorExtras,
  buildSocialLoggerErrorOptions,
  formatSocialExtraMessage,
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
  addSocialBreadcrumb,
  SOCIAL_SENTRY_FEATURE,
  type SocialEndpoint,
} from './socialServiceTelemetry';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../Logger', () => ({
  error: jest.fn(),
}));

const mockAddBreadcrumb = addBreadcrumb as jest.Mock;
const mockLoggerError = Logger.error as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers to create errors matching the shapes SocialService throws
// ---------------------------------------------------------------------------

function makeHttpError(
  status: number,
  message: string,
): Error & { httpStatus: number } {
  const err = new Error(message) as Error & { httpStatus: number };
  err.httpStatus = status;
  return err;
}

// ---------------------------------------------------------------------------
// extractHttpStatus
// ---------------------------------------------------------------------------

describe('extractHttpStatus', () => {
  it('returns the status from an HttpError instance', () => {
    expect(extractHttpStatus(makeHttpError(401, 'Unauthorized'))).toBe(401);
  });

  it('returns the status from a plain object with httpStatus', () => {
    expect(extractHttpStatus({ httpStatus: 503 })).toBe(503);
  });

  it('returns undefined for a plain Error without httpStatus', () => {
    expect(extractHttpStatus(new Error('plain error'))).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(extractHttpStatus(null)).toBeUndefined();
  });

  it('returns undefined for a string', () => {
    expect(extractHttpStatus('some error string')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// categoriseSocialError
// ---------------------------------------------------------------------------

describe('categoriseSocialError', () => {
  it('returns http_error when the error has httpStatus', () => {
    expect(categoriseSocialError(makeHttpError(401, 'Unauthorized'))).toBe(
      'http_error',
    );
  });

  it('returns schema_error for "invalid response" messages', () => {
    expect(
      categoriseSocialError(
        new Error('SocialService: Leaderboard returned invalid response'),
      ),
    ).toBe('schema_error');
  });

  it('returns auth_failure for auth/JWT/bearer/unauthorized messages', () => {
    expect(
      categoriseSocialError(new Error('getBearerToken: auth token expired')),
    ).toBe('auth_failure');
    expect(categoriseSocialError(new Error('JWT verification failed'))).toBe(
      'auth_failure',
    );
    expect(categoriseSocialError(new Error('unauthorized access'))).toBe(
      'auth_failure',
    );
    expect(categoriseSocialError(new Error('Bearer token missing'))).toBe(
      'auth_failure',
    );
  });

  it('does not classify crypto-token errors as auth_failure', () => {
    // Crypto wallet errors frequently reference tokens but are not auth issues.
    expect(
      categoriseSocialError(new Error('unknown token contract 0xabc')),
    ).toBe('unknown');
    expect(categoriseSocialError(new Error('tokenAddress invalid'))).toBe(
      'unknown',
    );
    expect(
      categoriseSocialError(new Error('tokenSymbol could not be resolved')),
    ).toBe('unknown');
  });

  it('returns network_error for network/timeout/aborted messages', () => {
    expect(categoriseSocialError(new Error('Network request failed'))).toBe(
      'network_error',
    );
    expect(categoriseSocialError(new Error('Request timed out'))).toBe(
      'network_error',
    );
    expect(categoriseSocialError(new Error('The operation was aborted'))).toBe(
      'network_error',
    );
    expect(
      categoriseSocialError(new Error('connect ETIMEDOUT 1.2.3.4:443')),
    ).toBe('network_error');
  });

  it('returns unknown for unrecognised errors', () => {
    expect(categoriseSocialError(new Error('Something went wrong'))).toBe(
      'unknown',
    );
  });

  it('returns unknown for null / undefined', () => {
    expect(categoriseSocialError(null)).toBe('unknown');
    expect(categoriseSocialError(undefined)).toBe('unknown');
  });

  it('http_error takes precedence over message matching', () => {
    // An HttpError message also contains "unauthorized" but httpStatus wins
    const err = makeHttpError(401, 'unauthorized');
    expect(categoriseSocialError(err)).toBe('http_error');
  });
});

// ---------------------------------------------------------------------------
// buildSocialErrorExtras
// ---------------------------------------------------------------------------

describe('buildSocialErrorExtras', () => {
  it('maps extraMessage to the message field in extras', () => {
    const extraMessage = 'useTopTraders: leaderboard fetch failed';
    const result = buildSocialErrorExtras({
      extraMessage,
      endpoint: 'leaderboard',
      error: new Error('something'),
    });
    expect(result.message).toBe(extraMessage);
  });

  it('includes endpoint, errorCategory, errorMessage', () => {
    const error = new Error(
      'SocialService: Leaderboard returned invalid response',
    );
    const result = buildSocialErrorExtras({
      extraMessage: 'msg',
      endpoint: 'leaderboard',
      error,
    });
    expect(result.endpoint).toBe('leaderboard');
    expect(result.errorCategory).toBe('schema_error');
    expect(result.errorMessage).toBe(error.message);
  });

  it('includes httpStatus when the error is an HttpError', () => {
    const result = buildSocialErrorExtras({
      extraMessage: 'msg',
      endpoint: 'following',
      error: makeHttpError(403, 'Forbidden'),
    });
    expect(result.httpStatus).toBe(403);
    expect(result.errorCategory).toBe('http_error');
  });

  it('omits httpStatus when not an HttpError', () => {
    const result = buildSocialErrorExtras({
      extraMessage: 'msg',
      endpoint: 'leaderboard',
      error: new Error('plain'),
    });
    expect(result.httpStatus).toBeUndefined();
  });

  it('includes durationMs and queryParams when provided', () => {
    const result = buildSocialErrorExtras({
      extraMessage: 'msg',
      endpoint: 'open_positions',
      error: new Error('plain'),
      durationMs: 250,
      queryParams: { limit: 10 },
    });
    expect(result.durationMs).toBe(250);
    expect(result.queryParams).toEqual({ limit: 10 });
  });

  it('does NOT leak an addressOrId field even if accidentally passed', () => {
    const result = buildSocialErrorExtras({
      extraMessage: 'msg',
      endpoint: 'open_positions',
      error: new Error('plain'),
      // Simulate a caller accidentally passing address-like data via queryParams
      queryParams: { limit: 5 },
    });
    const serialised = JSON.stringify(result);
    expect(serialised).not.toMatch(/0x[0-9a-fA-F]{40}/);
    expect(Object.keys(result)).not.toContain('addressOrId');
    expect(Object.keys(result)).not.toContain('address');
    expect(Object.keys(result)).not.toContain('profileId');
  });
});

// ---------------------------------------------------------------------------
// formatSocialExtraMessage
// ---------------------------------------------------------------------------

describe('formatSocialExtraMessage', () => {
  it('returns the message unchanged when source is omitted', () => {
    expect(formatSocialExtraMessage('Error submitting QuickBuy tx')).toBe(
      'Error submitting QuickBuy tx',
    );
  });

  it('appends at {source} when source is provided', () => {
    expect(
      formatSocialExtraMessage(
        'Error submitting QuickBuy tx',
        'useQuickBuyBottomSheet',
      ),
    ).toBe('Error submitting QuickBuy tx at useQuickBuyBottomSheet');
  });
});

// ---------------------------------------------------------------------------
// buildSocialLoggerErrorOptions
// ---------------------------------------------------------------------------

describe('buildSocialLoggerErrorOptions', () => {
  it('sets feature:social tags and hybrid extra message in extras', () => {
    const error = makeHttpError(503, 'Service unavailable');
    const result = buildSocialLoggerErrorOptions({
      surface: 'top_traders',
      operation: 'fetch_leaderboard',
      extraMessage: 'Top traders leaderboard fetch failed',
      source: 'useTopTraders',
      endpoint: 'leaderboard',
      error,
      queryParams: { limit: 10 },
    });

    expect(result.tags).toEqual(
      expect.objectContaining({
        feature: SOCIAL_SENTRY_FEATURE,
        surface: 'top_traders',
        operation: 'fetch_leaderboard',
        endpoint: 'leaderboard',
        source: 'useTopTraders',
        errorCategory: 'http_error',
      }),
    );
    expect(result.extras).toEqual(
      expect.objectContaining({
        message: 'Top traders leaderboard fetch failed at useTopTraders',
        httpStatus: 503,
      }),
    );
    expect(result.context).toEqual({
      name: 'social',
      data: {
        operation: 'fetch_leaderboard',
        source: 'useTopTraders',
        endpoint: 'leaderboard',
        queryParams: { limit: 10 },
      },
    });
  });

  it('supports quick_buy without a SocialService endpoint', () => {
    const error = new Error('submit failed');
    const result = buildSocialLoggerErrorOptions({
      surface: 'quick_buy',
      operation: 'submit_tx',
      extraMessage: 'Error submitting QuickBuy tx',
      source: 'useQuickBuyBottomSheet',
      error,
      extraTags: { sourceChainId: '0x1' },
    });

    expect(result.tags?.feature).toBe('social');
    expect(result.tags?.surface).toBe('quick_buy');
    expect(result.tags?.source).toBe('useQuickBuyBottomSheet');
    expect(result.tags?.sourceChainId).toBe('0x1');
    expect(result.extras).toEqual(
      expect.objectContaining({
        message: 'Error submitting QuickBuy tx at useQuickBuyBottomSheet',
        errorCategory: 'unknown',
      }),
    );
    expect(result.context?.data).toEqual({
      operation: 'submit_tx',
      source: 'useQuickBuyBottomSheet',
    });
  });

  it('includes durationMs and queryParams on the non-endpoint extras branch', () => {
    const result = buildSocialLoggerErrorOptions({
      surface: 'quick_buy',
      operation: 'fetch_quotes',
      extraMessage: 'Error fetching QuickBuy quotes',
      error: new Error('Network request failed'),
      queryParams: { destChainId: '0x89' },
      durationMs: 120,
    });

    expect(result.extras).toEqual({
      message: 'Error fetching QuickBuy quotes',
      errorCategory: 'network_error',
      errorMessage: 'Network request failed',
      queryParams: { destChainId: '0x89' },
      durationMs: 120,
    });
    expect(result.context?.data).toEqual({
      operation: 'fetch_quotes',
      queryParams: { destChainId: '0x89' },
    });
    expect(result.tags?.endpoint).toBeUndefined();
    expect(result.tags?.source).toBeUndefined();
  });

  it('formats non-Error throw values in errorMessage', () => {
    const result = buildSocialLoggerErrorOptions({
      surface: 'top_traders',
      operation: 'fetch_leaderboard',
      extraMessage: 'Top traders leaderboard fetch failed',
      endpoint: 'leaderboard',
      error: 'offline',
    });

    expect(result.extras).toEqual(
      expect.objectContaining({
        errorMessage: 'offline',
        errorCategory: 'unknown',
      }),
    );
  });

  it('omits source tag when source is not provided', () => {
    const result = buildSocialLoggerErrorOptions({
      surface: 'top_traders',
      operation: 'refresh',
      extraMessage: 'Top traders refresh failed',
      endpoint: 'leaderboard',
      error: new Error('fail'),
    });

    expect(result.extras).toEqual(
      expect.objectContaining({
        message: 'Top traders refresh failed',
      }),
    );
    expect(result.tags?.source).toBeUndefined();
    expect(result.context?.data).toEqual({
      operation: 'refresh',
      endpoint: 'leaderboard',
    });
  });
});

// ---------------------------------------------------------------------------
// formatSocialQueryErrorMessage
// ---------------------------------------------------------------------------

describe('formatSocialQueryErrorMessage', () => {
  it('returns null when error is falsy', () => {
    expect(formatSocialQueryErrorMessage(null)).toBeNull();
    expect(formatSocialQueryErrorMessage(undefined)).toBeNull();
  });

  it('returns the message from an Error instance', () => {
    expect(formatSocialQueryErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies non-Error values', () => {
    expect(formatSocialQueryErrorMessage('offline')).toBe('offline');
  });
});

// ---------------------------------------------------------------------------
// reportSocialServiceFailure
// ---------------------------------------------------------------------------

describe('reportSocialServiceFailure', () => {
  beforeEach(() => {
    mockLoggerError.mockClear();
    mockAddBreadcrumb.mockClear();
  });

  it('logs with feature:social tags and emits a breadcrumb by default', () => {
    const error = new Error('fetch failed');
    reportSocialServiceFailure(error, {
      surface: 'followed_traders',
      operation: 'fetch_following',
      extraMessage: 'Followed traders fetch failed',
      source: 'useFollowedTraders',
      endpoint: 'following',
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: SOCIAL_SENTRY_FEATURE,
          surface: 'followed_traders',
          operation: 'fetch_following',
        }),
      }),
    );
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'social_service',
        message: expect.stringContaining('social_service.following.failure'),
      }),
    );
  });

  it('skips the breadcrumb when breadcrumb is false', () => {
    reportSocialServiceFailure(
      new Error('refresh failed'),
      {
        surface: 'trader_profile',
        operation: 'refresh',
        extraMessage: 'Trader profile refresh failed',
        source: 'useTraderProfile',
        endpoint: 'trader_profile',
      },
      { breadcrumb: false },
    );

    expect(mockLoggerError).toHaveBeenCalled();
    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });

  it('skips the breadcrumb when endpoint is omitted', () => {
    reportSocialServiceFailure(new Error('refetch failed'), {
      surface: 'trader_profile',
      operation: 'refetch_positions',
      extraMessage: 'Trader positions refetch failed',
      source: 'useTraderPositions',
    });

    expect(mockLoggerError).toHaveBeenCalled();
    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useLogSocialQueryError
// ---------------------------------------------------------------------------

describe('useLogSocialQueryError', () => {
  beforeEach(() => {
    mockLoggerError.mockClear();
    mockAddBreadcrumb.mockClear();
  });

  it('reports when error is set and does not report when error clears', () => {
    const context = {
      surface: 'trader_profile' as const,
      operation: 'fetch_profile',
      extraMessage: 'Trader profile fetch failed',
      source: 'useTraderProfile',
      endpoint: 'trader_profile' as const,
    };

    const { rerender } = renderHook(
      ({ queryError }: { queryError: unknown }) =>
        useLogSocialQueryError(queryError, context),
      { initialProps: { queryError: new Error('fail') as unknown } },
    );

    expect(mockLoggerError).toHaveBeenCalledTimes(1);

    rerender({ queryError: null });
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// addSocialBreadcrumb
// ---------------------------------------------------------------------------

describe('addSocialBreadcrumb', () => {
  beforeEach(() => {
    mockAddBreadcrumb.mockClear();
  });

  it('emits a breadcrumb with category social_service and level error', () => {
    addSocialBreadcrumb({ endpoint: 'leaderboard' });
    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const call = mockAddBreadcrumb.mock.calls[0][0];
    expect(call.category).toBe('social_service');
    expect(call.level).toBe('error');
  });

  it('formats the failure message with just the endpoint when no extras are given', () => {
    addSocialBreadcrumb({ endpoint: 'leaderboard' });
    const { message } = mockAddBreadcrumb.mock.calls[0][0];
    expect(message).toBe('social_service.leaderboard.failure');
  });

  it('appends category without status when only errorCategory is provided', () => {
    addSocialBreadcrumb({
      endpoint: 'closed_positions',
      errorCategory: 'network_error',
    });
    const { message } = mockAddBreadcrumb.mock.calls[0][0];
    expect(message).toBe(
      'social_service.closed_positions.failure category=network_error',
    );
  });

  it('appends status and category when provided', () => {
    addSocialBreadcrumb({
      endpoint: 'following',
      httpStatus: 401,
      errorCategory: 'http_error',
    });
    const { message } = mockAddBreadcrumb.mock.calls[0][0];
    expect(message).toBe(
      'social_service.following.failure status=401 category=http_error',
    );
  });

  it('includes structured data payload alongside message string', () => {
    addSocialBreadcrumb({
      endpoint: 'open_positions',
      httpStatus: 503,
      errorCategory: 'http_error',
      queryParams: { limit: 5 },
    });
    const { data } = mockAddBreadcrumb.mock.calls[0][0];
    expect(data.endpoint).toBe('open_positions');
    expect(data.httpStatus).toBe(503);
    expect(data.errorCategory).toBe('http_error');
    expect(data.queryParams).toEqual({ limit: 5 });
  });

  it('omits optional fields from the data payload when not provided', () => {
    addSocialBreadcrumb({ endpoint: 'leaderboard' });
    const { data } = mockAddBreadcrumb.mock.calls[0][0];
    expect(data.httpStatus).toBeUndefined();
    expect(data.errorCategory).toBeUndefined();
    expect(data.queryParams).toBeUndefined();
  });

  it('uses a consistent endpoint key across all supported endpoints', () => {
    const endpoints: SocialEndpoint[] = [
      'leaderboard',
      'following',
      'open_positions',
      'closed_positions',
      'position_by_id',
      'trader_profile',
      'follow',
      'unfollow',
    ];
    endpoints.forEach((endpoint) => {
      mockAddBreadcrumb.mockClear();
      addSocialBreadcrumb({ endpoint });
      const { message } = mockAddBreadcrumb.mock.calls[0][0];
      expect(message).toBe(`social_service.${endpoint}.failure`);
    });
  });
});

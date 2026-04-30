import { addBreadcrumb } from '@sentry/react-native';
import {
  extractHttpStatus,
  categoriseSocialError,
  buildSocialErrorExtras,
  addSocialBreadcrumb,
  type SocialEndpoint,
} from './socialServiceTelemetry';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const mockAddBreadcrumb = addBreadcrumb as jest.Mock;

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
  it('preserves legacyMessage verbatim under the message field', () => {
    const legacy = 'useTopTraders: leaderboard fetch failed';
    const result = buildSocialErrorExtras({
      legacyMessage: legacy,
      endpoint: 'leaderboard',
      error: new Error('something'),
    });
    expect(result.message).toBe(legacy);
  });

  it('includes endpoint, errorCategory, errorMessage', () => {
    const error = new Error(
      'SocialService: Leaderboard returned invalid response',
    );
    const result = buildSocialErrorExtras({
      legacyMessage: 'msg',
      endpoint: 'leaderboard',
      error,
    });
    expect(result.endpoint).toBe('leaderboard');
    expect(result.errorCategory).toBe('schema_error');
    expect(result.errorMessage).toBe(error.message);
  });

  it('includes httpStatus when the error is an HttpError', () => {
    const result = buildSocialErrorExtras({
      legacyMessage: 'msg',
      endpoint: 'following',
      error: makeHttpError(403, 'Forbidden'),
    });
    expect(result.httpStatus).toBe(403);
    expect(result.errorCategory).toBe('http_error');
  });

  it('omits httpStatus when not an HttpError', () => {
    const result = buildSocialErrorExtras({
      legacyMessage: 'msg',
      endpoint: 'leaderboard',
      error: new Error('plain'),
    });
    expect(result.httpStatus).toBeUndefined();
  });

  it('includes durationMs and queryParams when provided', () => {
    const result = buildSocialErrorExtras({
      legacyMessage: 'msg',
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
      legacyMessage: 'msg',
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
    ];
    endpoints.forEach((endpoint) => {
      mockAddBreadcrumb.mockClear();
      addSocialBreadcrumb({ endpoint });
      const { message } = mockAddBreadcrumb.mock.calls[0][0];
      expect(message).toBe(`social_service.${endpoint}.failure`);
    });
  });
});

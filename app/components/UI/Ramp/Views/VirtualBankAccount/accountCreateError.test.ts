import Logger from '../../../../../util/Logger';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import {
  ACCOUNT_CREATE_ERROR_DESTINATION,
  accountCreateErrorVariantForDestination,
  buildAccountCreateSupportUrl,
  getAccountCreateErrorVariant,
  getAccountCreateFailureLogFields,
  getAccountCreateErrorPrimaryAction,
  getAccountCreateResultFromError,
  getAccountCreateResultFromResponse,
  logAccountCreateFailure,
  type AccountCreateRegistrationResult,
} from './accountCreateError';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('accountCreateError', () => {
  describe('getAccountCreateErrorVariant', () => {
    const cases: [
      string,
      AccountCreateRegistrationResult,
      ReturnType<typeof getAccountCreateErrorVariant>,
    ][] = [
      [
        'compliance rejection',
        { kind: 'fiat', status: 'AuthorizationFailed' },
        'details',
      ],
      ['suspended customer', { kind: 'http', status: 403 }, 'details'],
      ['rail unavailable', { kind: 'http', status: 422 }, 'details'],
      ['invalid bank details', { kind: 'http', status: 400 }, 'details'],
      [
        'rejected bank details',
        { kind: 'fiat', status: 'RegistrationFailed' },
        'details',
      ],
      ['unauthorized', { kind: 'http', status: 401 }, 'generic'],
      ['missing customer', { kind: 'http', status: 404 }, 'generic'],
      ['registration failure', { kind: 'http', status: 500 }, 'generic'],
      ['unknown failure', { kind: 'unknown' }, 'generic'],
      [
        'registration still pending',
        { kind: 'fiat', status: 'RegistrationPending' },
        null,
      ],
      ['existing account', { kind: 'http', status: 409 }, null],
      ['registered', { kind: 'fiat', status: 'Registered' }, null],
      [
        'email verification',
        { kind: 'fiat', status: 'AuthorizationRequired' },
        null,
      ],
    ];

    it.each(cases)('maps %s', (_label, result, variant) => {
      expect(getAccountCreateErrorVariant(result)).toBe(variant);
    });
  });

  describe('registration result extraction', () => {
    it('reads a fiat failure from a controller response', () => {
      const result = getAccountCreateResultFromResponse({
        status: 'RegistrationFailed',
        account_number: 'sensitive',
      });

      expect(result).toEqual({
        kind: 'fiat',
        status: 'RegistrationFailed',
      });
    });

    it('reads a fiat failure from a typed 200 error', () => {
      const result = getAccountCreateResultFromError({
        httpStatus: 200,
        fiatStatus: 'AuthorizationFailed',
        responseBody: { iban: 'sensitive' },
      });

      expect(result).toEqual({
        kind: 'fiat',
        status: 'AuthorizationFailed',
      });
    });

    it('does not relabel an unknown failure as HTTP 500', () => {
      const result = getAccountCreateResultFromError(new Error('network'));

      expect(result).toEqual({ kind: 'unknown' });
    });

    it('extracts only the trace id from an HTTP error message', () => {
      const error = Object.assign(
        new Error(
          'request failed - {"traceId":"moonpay-trace","iban":"GB29NWBK"}',
        ),
        { httpStatus: 400 },
      );

      const result = getAccountCreateResultFromError(error);

      expect(result).toEqual({
        kind: 'http',
        status: 400,
        traceId: 'moonpay-trace',
      });
      expect(JSON.stringify(result)).not.toContain('GB29NWBK');
    });
  });

  describe('getAccountCreateErrorPrimaryAction', () => {
    it('retries only a server-side registration failure', () => {
      expect(getAccountCreateErrorPrimaryAction({ httpStatus: 500 })).toBe(
        'retry',
      );
    });

    it.each([
      ['invalid bank details', 400],
      ['unauthorized', 401],
      ['suspended customer', 403],
      ['missing customer', 404],
      ['rail unavailable', 422],
    ])('opens support for %s', (_label, httpStatus) => {
      expect(getAccountCreateErrorPrimaryAction({ httpStatus })).toBe(
        'contactSupport',
      );
    });

    it('opens support when no HTTP status is available', () => {
      expect(getAccountCreateErrorPrimaryAction()).toBe('contactSupport');
    });
  });

  describe('getAccountCreateFailureLogFields', () => {
    it('keeps the trace id and drops the response body', () => {
      expect(
        getAccountCreateFailureLogFields({
          kind: 'http',
          status: 500,
          traceId: 'trace-1',
        }),
      ).toEqual({ httpStatus: 500, traceId: 'trace-1' });
    });

    it('records a 200 status name without a body', () => {
      expect(
        getAccountCreateFailureLogFields({
          kind: 'fiat',
          status: 'AuthorizationFailed',
        }),
      ).toEqual({ httpStatus: 200, fiatStatus: 'AuthorizationFailed' });
    });
  });

  describe('logAccountCreateFailure', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('logs only safe fields for a server failure', () => {
      const result = logAccountCreateFailure({
        kind: 'http',
        status: 500,
        traceId: 'trace-1',
        body: 'account number 123456',
      } as AccountCreateRegistrationResult);

      expect(result).toBe(ACCOUNT_CREATE_ERROR_DESTINATION.generic);
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        httpStatus: 500,
        traceId: 'trace-1',
      });
      expect(
        JSON.stringify(jest.mocked(Logger.error).mock.calls),
      ).not.toContain('123456');
    });

    it('logs a fiat failure and skips non-error statuses', () => {
      expect(
        logAccountCreateFailure({
          kind: 'fiat',
          status: 'AuthorizationFailed',
        }),
      ).toBe(ACCOUNT_CREATE_ERROR_DESTINATION.details);
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        httpStatus: 200,
        fiatStatus: 'AuthorizationFailed',
      });

      jest.clearAllMocks();
      expect(
        logAccountCreateFailure({
          kind: 'fiat',
          status: 'RegistrationPending',
        }),
      ).toBeNull();
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('buildAccountCreateSupportUrl', () => {
    it('adds the status and trace id and leaves the response body out', () => {
      const url = new URL(
        buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL, {
          httpStatus: 400,
          traceId: 'moonpay-trace',
        }),
      );

      expect(url.searchParams.get('http_status')).toBe('400');
      expect(url.searchParams.get('trace_id')).toBe('moonpay-trace');
      expect(url.searchParams.get('fiat_status')).toBeNull();
      expect(url.searchParams.get('utm_source')).toBe('mobile_app');
      expect(url.toString()).not.toContain('GB29NWBK');
    });

    it('adds the fiat status for a 200 registration failure', () => {
      const url = new URL(
        buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL, {
          httpStatus: 200,
          fiatStatus: 'RegistrationFailed',
        }),
      );

      expect(url.searchParams.get('http_status')).toBe('200');
      expect(url.searchParams.get('fiat_status')).toBe('RegistrationFailed');
      expect(url.searchParams.get('trace_id')).toBeNull();
    });

    it('leaves the help-center URL unchanged when there is no registration', () => {
      expect(buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL)).toBe(
        METAMASK_SUPPORT_URL,
      );
    });
  });

  it('maps each destination back to its screen', () => {
    expect(
      accountCreateErrorVariantForDestination(
        ACCOUNT_CREATE_ERROR_DESTINATION.details,
      ),
    ).toBe('details');
  });
});

import Logger from '../../../../../util/Logger';
import {
  ACCOUNT_CREATE_ERROR_DESTINATION,
  accountCreateErrorVariantForDestination,
  getAccountCreateErrorVariant,
  getAccountCreateFailureLogFields,
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
        'blocked',
      ],
      ['suspended customer', { kind: 'http', status: 403 }, 'blocked'],
      ['rail unavailable', { kind: 'http', status: 422 }, 'blocked'],
      ['invalid bank details', { kind: 'http', status: 400 }, 'details'],
      [
        'rejected bank details',
        { kind: 'fiat', status: 'RegistrationFailed' },
        'details',
      ],
      ['unauthorized', { kind: 'http', status: 401 }, 'generic'],
      ['missing customer', { kind: 'http', status: 404 }, 'generic'],
      ['registration failure', { kind: 'http', status: 500 }, 'generic'],
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

    it('logs status and trace id for a server failure', () => {
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
        JSON.stringify((Logger.error as jest.Mock).mock.calls),
      ).not.toContain('123456');
    });

    it('logs the fiat status for a compliance rejection', () => {
      const result = logAccountCreateFailure({
        kind: 'fiat',
        status: 'AuthorizationFailed',
      });

      expect(result).toBe(ACCOUNT_CREATE_ERROR_DESTINATION.blocked);
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        httpStatus: 200,
        fiatStatus: 'AuthorizationFailed',
      });
    });

    it.each([
      {
        label: 'registration still pending',
        result: { kind: 'fiat', status: 'RegistrationPending' },
      },
      {
        label: 'an existing account',
        result: { kind: 'http', status: 409 },
      },
      {
        label: 'a registered account',
        result: { kind: 'fiat', status: 'Registered' },
      },
      {
        label: 'email verification',
        result: { kind: 'fiat', status: 'AuthorizationRequired' },
      },
    ] as const)('does not log $label', ({ result: registrationResult }) => {
      const result = logAccountCreateFailure(
        registrationResult as AccountCreateRegistrationResult,
      );

      expect(result).toBeNull();
      expect(Logger.error).not.toHaveBeenCalled();
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

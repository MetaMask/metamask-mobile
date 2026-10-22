import {
  ACCOUNT_CREATE_ERROR_DESTINATION,
  accountCreateErrorVariantForDestination,
  getAccountCreateErrorVariant,
  getAccountCreateFailureLogFields,
  type AccountCreateRegistrationResult,
} from './accountCreateError';

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

  it('maps each destination back to its screen', () => {
    expect(
      accountCreateErrorVariantForDestination(
        ACCOUNT_CREATE_ERROR_DESTINATION.details,
      ),
    ).toBe('details');
  });
});

import {
  ACCOUNT_CREATE_ERROR_DESTINATION,
  accountCreateErrorVariantForDestination,
  getAccountCreateErrorVariant,
  getAccountCreateFailureLogFields,
  getVbaAccountCreateErrorOverride,
  type AccountCreateRegistrationResult,
} from './accountCreateError';
import { readVbaAccountCreateErrorOverrideEnv } from './accountCreateErrorOverride.env';

jest.mock('./accountCreateErrorOverride.env', () => ({
  readVbaAccountCreateErrorOverrideEnv: jest.fn(),
}));

const mockReadEnv = jest.mocked(readVbaAccountCreateErrorOverrideEnv);

describe('accountCreateError', () => {
  const devGlobal = globalThis as { __DEV__?: boolean };
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    devGlobal.__DEV__ = true;
    mockReadEnv.mockReturnValue(undefined);
  });

  afterAll(() => {
    devGlobal.__DEV__ = originalDev;
  });

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

  describe('getVbaAccountCreateErrorOverride', () => {
    it('returns null when the env var is unset', () => {
      expect(getVbaAccountCreateErrorOverride()).toBeNull();
    });

    it.each([
      ['blocked', 'blocked'],
      ['403', 'blocked'],
      ['AuthorizationFailed', 'blocked'],
      ['400', 'details'],
      ['RegistrationFailed', 'details'],
      ['500', 'generic'],
    ] as const)('maps %s to %s', (value, variant) => {
      mockReadEnv.mockReturnValue(value);

      expect(getVbaAccountCreateErrorOverride()).toBe(variant);
    });

    it('returns null for an unknown value', () => {
      mockReadEnv.mockReturnValue('banana');

      expect(getVbaAccountCreateErrorOverride()).toBeNull();
    });

    it('ignores the env var outside dev builds', () => {
      devGlobal.__DEV__ = false;
      mockReadEnv.mockReturnValue('blocked');

      expect(getVbaAccountCreateErrorOverride()).toBeNull();
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

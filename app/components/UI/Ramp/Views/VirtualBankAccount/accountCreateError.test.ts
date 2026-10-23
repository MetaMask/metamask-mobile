import Logger from '../../../../../util/Logger';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import {
  AccountCreateRegistrationError,
  ACCOUNT_CREATE_ERROR_DESTINATION,
  accountCreateErrorVariantForDestination,
  buildAccountCreateSupportUrl,
  getAccountCreateErrorVariant,
  getAccountCreateFailureLogFields,
  getAccountCreateErrorPrimaryAction,
  getAccountCreateResultFromError,
  getAccountCreateResultFromResponse,
  isAccountCreateErrorDestination,
  logAccountCreateFailure,
  type AccountCreateRegistrationResult,
  type AccountCreateHttpStatus,
  type FiatAddressStatus,
} from './accountCreateError';

jest.mock('../../../../../util/Logger', () => ({ error: jest.fn() }));

const http = (status: AccountCreateHttpStatus, traceId?: string) =>
  ({ kind: 'http', status, ...(traceId ? { traceId } : {}) }) as const;
const fiat = (status: FiatAddressStatus): AccountCreateRegistrationResult => ({
  kind: 'fiat',
  status,
});
const unknown = { kind: 'unknown' } as const;

describe('accountCreateError', () => {
  it.each<
    [
      string,
      AccountCreateRegistrationResult,
      ReturnType<typeof getAccountCreateErrorVariant>,
    ]
  >([
    ['authorization failure', fiat('AuthorizationFailed'), 'details'],
    ['registration failure', fiat('RegistrationFailed'), 'details'],
    ['invalid bank details', http(400), 'details'],
    ['suspended customer', http(403), 'details'],
    ['rail unavailable', http(422), 'details'],
    ['unauthorized', http(401), 'generic'],
    ['missing customer', http(404), 'generic'],
    ['server failure', http(500), 'generic'],
    ['unknown failure', unknown, 'generic'],
    ['existing account', http(409), null],
    ['pending account', fiat('RegistrationPending'), null],
    ['registered account', fiat('Registered'), null],
    ['email verification', fiat('AuthorizationRequired'), null],
  ])('maps %s', (_label, result, variant) => {
    expect(getAccountCreateErrorVariant(result)).toBe(variant);
  });

  describe('registration result extraction', () => {
    it('reads a fiat failure from a controller response', () => {
      const result = getAccountCreateResultFromResponse({
        status: 'RegistrationFailed',
        account_number: 'sensitive',
      });

      expect(result).toEqual(fiat('RegistrationFailed'));
    });

    it('reads a fiat failure from a typed 200 error', () => {
      const result = getAccountCreateResultFromError({
        httpStatus: 200,
        fiatStatus: 'AuthorizationFailed',
        responseBody: { iban: 'sensitive' },
      });

      expect(result).toEqual(fiat('AuthorizationFailed'));
    });

    it('preserves an existing typed registration error', () => {
      const typed = new AccountCreateRegistrationError({
        ...http(500),
      });

      expect(getAccountCreateResultFromError(typed)).toEqual(typed.result);
      expect(typed.name).toBe('AccountCreateRegistrationError');
      expect(typed.message).toBe('VBA account creation failed');
    });

    it.each([400, 401, 403, 404, 409, 422, 500] as const)(
      'reads supported HTTP %s failures',
      (status) => {
        expect(getAccountCreateResultFromError({ httpStatus: status })).toEqual(
          http(status),
        );
      },
    );

    it('reads direct and serialized trace identifiers without sensitive data', () => {
      const direct = getAccountCreateResultFromError({
        httpStatus: 400,
        traceId: 'direct-trace',
      });
      const serialized = getAccountCreateResultFromError(
        Object.assign(
          new Error('{"trace_id":"message-trace","iban":"GB29NWBK"}'),
          { httpStatus: 400 },
        ),
      );

      expect(direct).toEqual(http(400, 'direct-trace'));
      expect(serialized).toEqual(http(400, 'message-trace'));
      expect(JSON.stringify(serialized)).not.toContain('GB29NWBK');
    });

    it.each([
      null,
      'network',
      new Error('network'),
      { httpStatus: 418 },
      { httpStatus: 200, fiatStatus: 'Unknown' },
    ])('returns unknown for unsupported error %p', (error) => {
      expect(getAccountCreateResultFromError(error)).toEqual(unknown);
    });

    it.each([null, 'response', {}, { status: 3 }, { status: 'Unknown' }])(
      'ignores response without a fiat status: %p',
      (response) => {
        expect(getAccountCreateResultFromResponse(response)).toBeNull();
      },
    );
  });

  it.each([
    [500, 'retry'],
    [400, 'contactSupport'],
    [undefined, 'contactSupport'],
  ] as const)('maps HTTP %s to %s', (httpStatus, action) => {
    const fields = httpStatus === undefined ? undefined : { httpStatus };

    expect(getAccountCreateErrorPrimaryAction(fields)).toBe(action);
  });

  describe('logAccountCreateFailure', () => {
    beforeEach(() => jest.clearAllMocks());

    it('logs safe fields and skips non-error statuses', () => {
      expect(
        logAccountCreateFailure({
          ...http(500, 'trace-1'),
          body: 'account number 123456',
        } as AccountCreateRegistrationResult),
      ).toBe(ACCOUNT_CREATE_ERROR_DESTINATION.generic);
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        httpStatus: 500,
        traceId: 'trace-1',
      });
      expect(
        JSON.stringify(jest.mocked(Logger.error).mock.calls),
      ).not.toContain('123456');

      jest.clearAllMocks();
      expect(logAccountCreateFailure(fiat('RegistrationPending'))).toBeNull();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('logs fiat failures', () => {
      expect(logAccountCreateFailure(fiat('AuthorizationFailed'))).toBe(
        ACCOUNT_CREATE_ERROR_DESTINATION.details,
      );
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        httpStatus: 200,
        fiatStatus: 'AuthorizationFailed',
      });
    });
  });

  describe('safe support fields', () => {
    it.each([
      [unknown, undefined],
      [http(500), { httpStatus: 500 }],
      [http(500, 'trace-1'), { httpStatus: 500, traceId: 'trace-1' }],
      [
        fiat('AuthorizationFailed'),
        { httpStatus: 200, fiatStatus: 'AuthorizationFailed' },
      ],
    ] as const)('extracts fields from %p', (result, fields) => {
      expect(
        getAccountCreateFailureLogFields(
          result as AccountCreateRegistrationResult,
        ),
      ).toEqual(fields);
    });

    it('adds only supplied registration fields to the support URL', () => {
      const url = new URL(
        buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL, {
          httpStatus: 200,
          fiatStatus: 'RegistrationFailed',
          traceId: 'moonpay-trace',
        }),
      );

      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        http_status: '200',
        fiat_status: 'RegistrationFailed',
        trace_id: 'moonpay-trace',
      });
      expect(url.searchParams.get('utm_source')).toBe('mobile_app');
      expect(url.toString()).not.toContain('GB29NWBK');
    });

    it('leaves the help-center URL unchanged when there is no registration', () => {
      expect(buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL)).toBe(
        METAMASK_SUPPORT_URL,
      );
    });
  });

  it.each([
    [ACCOUNT_CREATE_ERROR_DESTINATION.details, 'details'],
    [ACCOUNT_CREATE_ERROR_DESTINATION.generic, 'generic'],
  ] as const)('maps destination %s to %s', (destination, variant) => {
    expect(isAccountCreateErrorDestination(destination)).toBe(true);
    expect(accountCreateErrorVariantForDestination(destination)).toBe(variant);
  });

  it('rejects unrelated destinations', () => {
    expect(isAccountCreateErrorDestination('complete')).toBe(false);
  });
});

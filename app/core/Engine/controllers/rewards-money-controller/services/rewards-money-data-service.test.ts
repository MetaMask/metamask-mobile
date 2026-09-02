import { Messenger } from '@metamask/messenger';
import {
  ClaimAlreadyOpenError,
  ReferralProgramAuthorizationError,
  RewardsMoneyDataService,
  buildOriginTypeQuery,
  type RewardsMoneyDataServiceMessenger,
} from './rewards-money-data-service';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.2.3'),
}));

const BASE_URL = 'https://referral-program.test';

const createResponse = (
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response => {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
};

const createService = ({
  fetchFn = jest.fn().mockResolvedValue(createResponse({})),
  getBearerToken = jest.fn().mockResolvedValue('hydra-token'),
  baseUrl = BASE_URL,
}: {
  fetchFn?: jest.Mock;
  getBearerToken?: jest.Mock;
  baseUrl?: string;
} = {}) => {
  const messenger = new Messenger({
    namespace: 'RewardsMoneyDataService',
  }) as unknown as RewardsMoneyDataServiceMessenger;

  const service = new RewardsMoneyDataService({
    messenger,
    fetch: fetchFn as unknown as typeof fetch,
    baseUrl,
    getBearerToken: getBearerToken as unknown as () => Promise<
      string | undefined
    >,
    locale: 'en-GB',
  });

  return { service, fetchFn, getBearerToken };
};

describe('buildOriginTypeQuery', () => {
  it('returns an empty string for an omitted set', () => {
    const result = buildOriginTypeQuery(undefined);

    expect(result).toBe('');
  });

  it('returns an empty string for an empty set so the server reads it as all types', () => {
    const result = buildOriginTypeQuery([]);

    expect(result).toBe('');
  });

  it('repeats the parameter once per origin type', () => {
    const result = buildOriginTypeQuery(['CASHBACK', 'REFERRAL_REV_SHARE']);

    expect(result).toBe(
      '?earning_origin_type=CASHBACK&earning_origin_type=REFERRAL_REV_SHARE',
    );
  });
});

describe('RewardsMoneyDataService', () => {
  describe('getReferralMe', () => {
    it('requests /referral/me on the configured base URL', async () => {
      const payload = { role: 'REFERRER' };
      const fetchFn = jest.fn().mockResolvedValue(createResponse(payload));
      const { service } = createService({ fetchFn });

      const result = await service.getReferralMe();

      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/referral/me`,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toStrictEqual(payload);
    });

    it('sends the Hydra bearer token, not a subscription token', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({ fetchFn });

      await service.getReferralMe();

      const [, options] = fetchFn.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer hydra-token');
      expect(options.headers['rewards-access-token']).toBeUndefined();
    });

    it('sends the client id and locale headers', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({ fetchFn });

      await service.getReferralMe();

      const [, options] = fetchFn.mock.calls[0];
      expect(options.headers['rewards-client-id']).toBe('mobile-1.2.3');
      expect(options.headers['Accept-Language']).toBe('en-GB');
    });

    it('throws an authorization error when no bearer token is available', async () => {
      const getBearerToken = jest.fn().mockResolvedValue(undefined);
      const fetchFn = jest.fn();
      const { service } = createService({ fetchFn, getBearerToken });

      await expect(service.getReferralMe()).rejects.toThrow(
        ReferralProgramAuthorizationError,
      );
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('throws an authorization error on a 403 response', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(createResponse({}, { status: 403 }));
      const { service } = createService({ fetchFn });

      await expect(service.getReferralMe()).rejects.toThrow(
        ReferralProgramAuthorizationError,
      );
    });

    it('throws with the status code on a 500 response', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(createResponse({}, { status: 500 }));
      const { service } = createService({ fetchFn });

      await expect(service.getReferralMe()).rejects.toThrow(
        'Get referral me failed: 500',
      );
    });

    it('strips a trailing slash from the configured base URL', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({
        fetchFn,
        baseUrl: 'http://localhost:3000/',
      });

      await service.getReferralMe();

      expect(fetchFn).toHaveBeenCalledWith(
        'http://localhost:3000/referral/me',
        expect.anything(),
      );
      expect(service.getBaseUrl()).toBe('http://localhost:3000');
    });
  });

  describe('getEarningsSummary', () => {
    it('scopes the request to the supplied origin types', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({ fetchFn });

      await service.getEarningsSummary(['CASHBACK', 'REFERRAL_REV_SHARE']);

      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/earnings/summary?earning_origin_type=CASHBACK&earning_origin_type=REFERRAL_REV_SHARE`,
        expect.anything(),
      );
    });

    it('omits the filter entirely when no scope is given', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({ fetchFn });

      await service.getEarningsSummary();

      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/earnings/summary`,
        expect.anything(),
      );
    });

    it('throws with the status code on a failed response', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(createResponse({}, { status: 502 }));
      const { service } = createService({ fetchFn });

      await expect(service.getEarningsSummary()).rejects.toThrow(
        'Get earnings summary failed: 502',
      );
    });
  });

  describe('getEarningsLedger', () => {
    it('sends the origin-type filter and the page size on a first page', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({ fetchFn });

      await service.getEarningsLedger(['CASHBACK'], null, 20);

      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/earnings/ledger?limit=20&earning_origin_type=CASHBACK`,
        expect.anything(),
      );
    });

    it('sends only the cursor on a later page, because the filter is folded into it', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({ fetchFn });

      await service.getEarningsLedger(['CASHBACK'], 'cursor-abc', 20);

      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/earnings/ledger?limit=20&cursor=cursor-abc`,
        expect.anything(),
      );
    });

    it('throws with the status code on a failed response', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(createResponse({}, { status: 400 }));
      const { service } = createService({ fetchFn });

      await expect(service.getEarningsLedger()).rejects.toThrow(
        'Get earnings ledger failed: 400',
      );
    });
  });

  describe('initiateClaim', () => {
    it('posts the money account address and the requested origin types', async () => {
      const fetchFn = jest.fn().mockResolvedValue(createResponse({}));
      const { service } = createService({ fetchFn });

      await service.initiateClaim('0xabc', ['CASHBACK']);

      const [url, options] = fetchFn.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/wr/earnings/claim`);
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toStrictEqual({
        money_account_address: '0xabc',
        earning_origin_types: ['CASHBACK'],
      });
    });

    it('throws ClaimAlreadyOpenError on a 409 response', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(createResponse({}, { status: 409 }));
      const { service } = createService({ fetchFn });

      await expect(
        service.initiateClaim('0xabc', ['CASHBACK']),
      ).rejects.toThrow(ClaimAlreadyOpenError);
    });

    it('throws with the status code on any other failure', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(createResponse({}, { status: 422 }));
      const { service } = createService({ fetchFn });

      await expect(
        service.initiateClaim('0xabc', ['CASHBACK']),
      ).rejects.toThrow('Initiate claim failed: 422');
    });
  });

  it('registers every action handler on its messenger', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(createResponse({ role: 'NONE' }));
    const messenger = new Messenger({
      namespace: 'RewardsMoneyDataService',
    }) as unknown as RewardsMoneyDataServiceMessenger;
    // eslint-disable-next-line no-new
    new RewardsMoneyDataService({
      messenger,
      fetch: fetchFn as unknown as typeof fetch,
      baseUrl: BASE_URL,
      getBearerToken: jest.fn().mockResolvedValue('t'),
    });

    const result = await messenger.call(
      'RewardsMoneyDataService:getReferralMe',
    );

    expect(result).toStrictEqual({ role: 'NONE' });
  });
});

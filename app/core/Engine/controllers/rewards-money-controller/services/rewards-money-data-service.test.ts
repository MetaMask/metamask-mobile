import { getVersion } from 'react-native-device-info';
import {
  RewardsMoneyDataService,
  RewardsMoneyAuthorizationError,
  buildOriginTypeQuery,
  type RewardsMoneyDataServiceMessenger,
} from './rewards-money-data-service';
import {
  canChangeRewardsMoneyEnvUrl,
  getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv,
} from '../utils/rewards-money-api-url';
import AppConstants from '../../../../AppConstants';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../AppConstants', () => ({
  REWARDS_MONEY_API_URL: {
    DEV: 'https://dev.rewards-money.test',
    UAT: 'https://uat.rewards-money.test',
    PRD: 'https://prd.rewards-money.test',
  },
}));
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.50.1'),
}));
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));
jest.mock('../utils/rewards-money-api-url', () => ({
  ...jest.requireActual('../utils/rewards-money-api-url'),
  canChangeRewardsMoneyEnvUrl: jest.fn(),
  getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv: jest.fn(),
}));

const mockCanChange = canChangeRewardsMoneyEnvUrl as jest.MockedFunction<
  typeof canChangeRewardsMoneyEnvUrl
>;
const mockGetDefault =
  getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv as jest.MockedFunction<
    typeof getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv
  >;
const mockGetVersion = getVersion as jest.MockedFunction<typeof getVersion>;

const okJson = <T>(body: T): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => body,
  }) as Response;

const notOk = (status: number): Response =>
  ({
    ok: false,
    status,
  }) as Response;

describe('RewardsMoneyDataService', () => {
  const originalEnv = process.env;
  let mockMessenger: jest.Mocked<RewardsMoneyDataServiceMessenger>;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let getBearerToken: jest.MockedFunction<() => Promise<string | undefined>>;
  let service: RewardsMoneyDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.REWARDS_MONEY_API_URL;
    mockGetVersion.mockReturnValue('7.50.1');

    mockGetDefault.mockReturnValue([
      AppConstants.REWARDS_MONEY_API_URL.DEV,
      true,
    ]);
    mockCanChange.mockReturnValue(true);

    mockMessenger = {
      registerActionHandler: jest.fn(),
      call: jest.fn(),
    } as unknown as jest.Mocked<RewardsMoneyDataServiceMessenger>;

    mockFetch = jest.fn();
    getBearerToken = jest.fn().mockResolvedValue('hydra-token');

    service = new RewardsMoneyDataService({
      messenger: mockMessenger,
      fetch: mockFetch,
      getBearerToken,
      appType: 'mobile',
      locale: 'en-US',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('registers all action handlers', () => {
      const expected = [
        'getReferralMe',
        'getReferralFunnel',
        'getReferralCodes',
        'validateReferralCode',
        'getEarningsSummary',
        'getEarningsLedger',
        'getClaimHistory',
        'getCommissions',
        'getClaimById',
        'getRewardsMoneyEnvUrl',
        'canChangeRewardsMoneyEnvUrl',
        'setRewardsMoneyEnvUrl',
        'getDefaultRewardsMoneyEnvUrl',
      ];
      for (const method of expected) {
        expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
          `RewardsMoneyDataService:${method}`,
          expect.any(Function),
        );
      }
    });
  });

  describe('authentication', () => {
    it('attaches Authorization Bearer for authenticated reads', async () => {
      mockFetch.mockResolvedValue(
        okJson({
          role: 'NONE',
          variant: 'NONE',
          user_type: 'REGULAR',
          status: 'ACTIVE',
          referral_code: null,
          referred_by: null,
          earn_rates: {
            revshare_rate_bps: null,
            cashback_rate_bps: null,
            revshare_earning_term_minutes: null,
            cashback_earning_term_minutes: null,
          },
        }),
      );

      await service.getReferralMe();

      expect(getBearerToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/referral/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer hydra-token',
            'rewards-client-id': 'mobile-7.50.1',
            'Accept-Language': 'en-US',
          }),
        }),
      );
    });

    it('throws RewardsMoneyAuthorizationError when bearer is missing', async () => {
      getBearerToken.mockResolvedValue(undefined);

      await expect(service.getReferralMe()).rejects.toBeInstanceOf(
        RewardsMoneyAuthorizationError,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws RewardsMoneyAuthorizationError on 401', async () => {
      mockFetch.mockResolvedValue(notOk(401));

      await expect(service.getReferralMe()).rejects.toBeInstanceOf(
        RewardsMoneyAuthorizationError,
      );
    });

    it('throws RewardsMoneyAuthorizationError on 403', async () => {
      mockFetch.mockResolvedValue(notOk(403));

      await expect(service.getEarningsSummary()).rejects.toBeInstanceOf(
        RewardsMoneyAuthorizationError,
      );
    });

    it('does not attach Authorization for validateReferralCode', async () => {
      mockFetch.mockResolvedValue(okJson({ success: true }));

      await service.validateReferralCode('ABC123');

      expect(getBearerToken).not.toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      expect(
        (options?.headers as Record<string, string>).Authorization,
      ).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/referral/validate?code=ABC123'),
        expect.any(Object),
      );
    });

    it('continues when getVersion throws', async () => {
      mockGetVersion.mockImplementation(() => {
        throw new Error('version unavailable');
      });
      mockFetch.mockResolvedValue(okJson({ success: true }));

      await service.validateReferralCode('ABC123');

      expect(Logger.log).toHaveBeenCalledWith(
        'RewardsMoneyDataService: failed to read app version',
        'version unavailable',
      );
      const [, options] = mockFetch.mock.calls[0];
      expect(
        (options?.headers as Record<string, string>)['rewards-client-id'],
      ).toBeUndefined();
    });

    it('maps AbortError to a timeout Error', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(service.getReferralMe()).rejects.toThrow(
        'Request timeout after 10000ms',
      );
    });

    it('rethrows non-abort fetch failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network down'));

      await expect(service.getReferralMe()).rejects.toThrow('Network down');
    });

    it('strips trailing slashes from the base URL', async () => {
      service.setRewardsMoneyEnvUrl('https://dev.rewards-money.test///');
      mockFetch.mockResolvedValue(okJson({ success: true }));

      await service.validateReferralCode('XYZ');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.rewards-money.test/referral/validate?code=XYZ',
        expect.any(Object),
      );
    });
  });

  describe('reads', () => {
    it('fetches referral funnel', async () => {
      const body = { enrolled: 3, earning_generating: 1 };
      mockFetch.mockResolvedValue(okJson(body));

      await expect(service.getReferralFunnel()).resolves.toEqual(body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/referral/me/funnel'),
        expect.any(Object),
      );
    });

    it('throws when referral funnel fails', async () => {
      mockFetch.mockResolvedValue(notOk(500));
      await expect(service.getReferralFunnel()).rejects.toThrow(
        'Get referral funnel failed: 500',
      );
    });

    it('fetches referral codes', async () => {
      const body = { codes: [{ code: 'ABC' }] };
      mockFetch.mockResolvedValue(okJson(body));

      await expect(service.getReferralCodes()).resolves.toEqual(body);
    });

    it('throws when referral codes fail', async () => {
      mockFetch.mockResolvedValue(notOk(502));
      await expect(service.getReferralCodes()).rejects.toThrow(
        'Get referral codes failed: 502',
      );
    });

    it('throws when validate referral code fails', async () => {
      mockFetch.mockResolvedValue(notOk(400));
      await expect(service.validateReferralCode('BAD')).rejects.toThrow(
        'Validate referral code failed: 400',
      );
    });

    it('throws when referral me fails with a non-auth status', async () => {
      mockFetch.mockResolvedValue(notOk(500));
      await expect(service.getReferralMe()).rejects.toThrow(
        'Get referral me failed: 500',
      );
    });

    it('fetches earnings summary with origin-type query', async () => {
      mockFetch.mockResolvedValue(
        okJson({
          lifetime_total: '0',
          window: null,
          pending: '0',
          claimed: '0',
          forfeited: '0',
          minimum_musd_base_units: '0',
          self_earned: {
            lifetime: '0',
            pending: '0',
            claimed: '0',
            forfeited: '0',
            by_claim_family: {},
          },
          earned_by_others: {
            lifetime: '0',
            pending: '0',
            claimed: '0',
            forfeited: '0',
            by_claim_family: {},
          },
        }),
      );

      await service.getEarningsSummary([
        'SWAPS_FEE_CASHBACK',
        'PERPS_FEE_CASHBACK',
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'earning_origin_type=SWAPS_FEE_CASHBACK&earning_origin_type=PERPS_FEE_CASHBACK',
        ),
        expect.any(Object),
      );
    });

    it('throws when earnings summary fails', async () => {
      mockFetch.mockResolvedValue(notOk(503));
      await expect(service.getEarningsSummary()).rejects.toThrow(
        'Get earnings summary failed: 503',
      );
    });

    it('sends origin types on ledger page 1', async () => {
      mockFetch.mockResolvedValue(
        okJson({
          results: [],
          has_more: false,
          cursor: null,
          window: null,
        }),
      );

      await service.getEarningsLedger(['SWAPS_FEE_CASHBACK']);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('earning_origin_type=SWAPS_FEE_CASHBACK');
      expect(url).toContain('limit=20');
      expect(url).toContain('include_claims=true');
      expect(url).not.toContain('cursor=');
    });

    it('sends cursor without origin types on ledger page 2', async () => {
      mockFetch.mockResolvedValue(
        okJson({
          results: [],
          has_more: false,
          cursor: null,
          window: null,
        }),
      );

      await service.getEarningsLedger(['SWAPS_FEE_CASHBACK'], 'cursor-1');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('cursor=cursor-1');
      expect(url).toContain('include_claims=true');
      expect(url).not.toContain('earning_origin_type');
    });

    it('can request accrual-only ledger pages', async () => {
      mockFetch.mockResolvedValue(
        okJson({
          results: [],
          has_more: false,
          cursor: null,
          window: null,
        }),
      );

      await service.getEarningsLedger(undefined, null, 20, false);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('include_claims=false');
    });

    it('throws when earnings ledger fails', async () => {
      mockFetch.mockResolvedValue(notOk(500));
      await expect(service.getEarningsLedger()).rejects.toThrow(
        'Get earnings ledger failed: 500',
      );
    });

    it('fetches claim history with optional cursor', async () => {
      const body = { results: [], has_more: false, cursor: null };
      mockFetch.mockResolvedValue(okJson(body));

      await expect(service.getClaimHistory('next-page')).resolves.toEqual(body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/earnings/claim/me?limit=20&cursor=next-page'),
        expect.any(Object),
      );
    });

    it('throws when claim history fails', async () => {
      mockFetch.mockResolvedValue(notOk(404));
      await expect(service.getClaimHistory()).rejects.toThrow(
        'Get claim history failed: 404',
      );
    });

    it('fetches commissions with no filter', async () => {
      const body = {
        results: [],
        mechanisms: {
          REFERRAL_REV_SHARE: { claim_open: true, reason: null },
          SOCIAL_FOLLOW_TRADE: {
            claim_open: false,
            reason: 'MECHANISM_NOT_CLAIMABLE',
          },
        },
        has_more: false,
        cursor: null,
      };
      mockFetch.mockResolvedValue(okJson(body));

      await expect(service.getCommissions()).resolves.toEqual(body);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/referral/me/commissions?');
      expect(url).toContain('limit=20');
      expect(url).not.toContain('earning_origin_type');
      expect(url).not.toContain('cursor=');
      expect(url).not.toContain('from_day');
    });

    it('sends a single mechanism filter', async () => {
      mockFetch.mockResolvedValue(
        okJson({ results: [], mechanisms: {}, has_more: false, cursor: null }),
      );

      await service.getCommissions('REFERRAL_REV_SHARE');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('earning_origin_type=REFERRAL_REV_SHARE');
    });

    // The commissions cursor stamps the filter and the server 400s when the
    // request omits it — the opposite of the ledger, which reads it from the
    // cursor alone.
    it('resends the mechanism filter alongside the cursor', async () => {
      mockFetch.mockResolvedValue(
        okJson({ results: [], mechanisms: {}, has_more: false, cursor: null }),
      );

      await service.getCommissions(
        'SOCIAL_FOLLOW_TRADE',
        'commissions-cursor-1',
      );

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('cursor=commissions-cursor-1');
      expect(url).toContain('earning_origin_type=SOCIAL_FOLLOW_TRADE');
    });

    it('sends from_day only when not paging', async () => {
      mockFetch.mockResolvedValue(
        okJson({ results: [], mechanisms: {}, has_more: false, cursor: null }),
      );

      await service.getCommissions(undefined, null, 50, '2026-09-01');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('from_day=2026-09-01');
      expect(url).toContain('limit=50');

      mockFetch.mockClear();
      await service.getCommissions(undefined, 'next', 50, '2026-09-01');

      const [pagedUrl] = mockFetch.mock.calls[0];
      expect(pagedUrl).toContain('cursor=next');
      expect(pagedUrl).not.toContain('from_day');
    });

    it('throws when commissions fails', async () => {
      mockFetch.mockResolvedValue(notOk(400));
      await expect(service.getCommissions()).rejects.toThrow(
        'Get commissions failed: 400',
      );
    });

    it('fetches claim by id', async () => {
      const body = { id: 'claim-1', status: 'PENDING' };
      mockFetch.mockResolvedValue(okJson(body));

      await expect(service.getClaimById('claim-1')).resolves.toEqual(body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/earnings/claim/claim-1'),
        expect.any(Object),
      );
    });

    it('throws when claim by id fails', async () => {
      mockFetch.mockResolvedValue(notOk(404));
      await expect(service.getClaimById('missing')).rejects.toThrow(
        'Get claim by id failed: 404',
      );
    });
  });

  describe('env URL', () => {
    it('returns override when canChange is true', () => {
      service.setRewardsMoneyEnvUrl('https://custom.example');
      expect(service.getRewardsMoneyEnvUrl()).toBe('https://custom.example');
      expect(Logger.log).toHaveBeenCalledWith(
        'RewardsMoneyDataService: env switched to https://custom.example',
      );
    });

    it('ignores set when canChange is false', () => {
      mockCanChange.mockReturnValue(false);
      mockGetDefault.mockReturnValue([
        AppConstants.REWARDS_MONEY_API_URL.PRD,
        false,
      ]);

      service.setRewardsMoneyEnvUrl('https://custom.example');
      expect(service.getRewardsMoneyEnvUrl()).toBe(
        AppConstants.REWARDS_MONEY_API_URL.PRD,
      );
    });

    it('exposes canChange and default URL helpers', () => {
      expect(service.canChangeRewardsMoneyEnvUrl()).toBe(true);
      expect(service.getDefaultRewardsMoneyEnvUrl()).toBe(
        AppConstants.REWARDS_MONEY_API_URL.DEV,
      );
    });

    it('returns the default URL when no override is set', () => {
      expect(service.getRewardsMoneyEnvUrl()).toBe(
        AppConstants.REWARDS_MONEY_API_URL.DEV,
      );
    });
  });

  describe('buildOriginTypeQuery', () => {
    it('returns empty string for no types', () => {
      expect(buildOriginTypeQuery()).toBe('');
      expect(buildOriginTypeQuery([])).toBe('');
    });

    it('builds repeatable query params', () => {
      expect(buildOriginTypeQuery(['REFERRAL_REV_SHARE'])).toBe(
        '?earning_origin_type=REFERRAL_REV_SHARE',
      );
    });
  });
});

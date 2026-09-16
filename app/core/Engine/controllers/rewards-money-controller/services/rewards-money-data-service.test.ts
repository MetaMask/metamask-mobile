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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
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
      } as Response);

      await service.getReferralMe();

      expect(getBearerToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/referral/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer hydra-token',
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      await expect(service.getReferralMe()).rejects.toBeInstanceOf(
        RewardsMoneyAuthorizationError,
      );
    });

    it('throws RewardsMoneyAuthorizationError on 403', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      await expect(service.getEarningsSummary()).rejects.toBeInstanceOf(
        RewardsMoneyAuthorizationError,
      );
    });

    it('does not attach Authorization for validateReferralCode', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

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
  });

  describe('reads', () => {
    it('fetches earnings summary with origin-type query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
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
      } as Response);

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

    it('sends cursor without origin types on ledger page 2', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [],
          has_more: false,
          cursor: null,
          window: null,
        }),
      } as Response);

      await service.getEarningsLedger(['SWAPS_FEE_CASHBACK'], 'cursor-1');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('cursor=cursor-1');
      expect(url).not.toContain('earning_origin_type');
    });
  });

  describe('env URL', () => {
    it('returns override when canChange is true', () => {
      service.setRewardsMoneyEnvUrl('https://custom.example');
      expect(service.getRewardsMoneyEnvUrl()).toBe('https://custom.example');
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

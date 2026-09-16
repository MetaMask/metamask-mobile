/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  RewardsMoneyController,
  getRewardsMoneyControllerDefaultState,
  originTypeScopeKey,
  REFERRAL_ME_CACHE_THRESHOLD_MS,
  EARNINGS_SUMMARY_CACHE_THRESHOLD_MS,
} from './RewardsMoneyController';
import type { RewardsMoneyControllerMessenger } from '../../messengers/rewards-money-controller-messenger';
import type {
  ClaimDto,
  ClaimHistoryPageDto,
  EarningsLedgerPageDto,
  EarningsSummaryDto,
  OwnReferralCodesDto,
  ReferralFunnelDto,
  ReferralMeDto,
  RewardsMoneyControllerState,
} from './types';

const mockReferralMe: ReferralMeDto = {
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: {
    code: 'KOL1',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: null,
  },
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: 1000,
    cashback_rate_bps: null,
    revshare_earning_term_minutes: 525600,
    cashback_earning_term_minutes: null,
  },
};

const mockFunnel: ReferralFunnelDto = {
  enrolled: 3,
  earning_generating: 1,
};

const mockCodes: OwnReferralCodesDto = {
  codes: [
    {
      code: 'KOL1',
      kind: 'PRIMARY',
      status: 'ACTIVE',
      active_from: null,
      active_until: null,
    },
  ],
};

const mockSummary: EarningsSummaryDto = {
  lifetime_total: '100',
  window: null,
  claimable: '50',
  held: '0',
  blocked: '0',
  pending: '0',
  claimed: '50',
  forfeited: '0',
  minimum_musd_base_units: '1000000',
  self_earned: {
    lifetime: '100',
    pending: '0',
    claimed: '50',
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
};

const mockLedgerPage: EarningsLedgerPageDto = {
  results: [],
  has_more: false,
  cursor: null,
  window: null,
};

const mockClaimHistory: ClaimHistoryPageDto = {
  results: [],
  has_more: false,
  cursor: null,
};

const mockClaim: ClaimDto = {
  id: 'claim-1',
  beneficiary_profile_id: 'profile-1',
  money_account_address: '0xabc',
  earning_origin_types: ['SWAPS_FEE_CASHBACK'],
  gross_amount: '50',
  withheld_amount: '0',
  net_amount: '50',
  withholding_rate_bps: 0,
  nonce: null,
  signature: null,
  valid_before: null,
  settled_block: null,
  settled_tx_hash: null,
  settled_at: null,
  released_at: null,
  status: 'AUTHORIZED',
  route: 'SELF',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('originTypeScopeKey', () => {
  it('returns all for empty or missing', () => {
    expect(originTypeScopeKey()).toBe('all');
    expect(originTypeScopeKey([])).toBe('all');
  });

  it('sorts origin types so order does not matter', () => {
    expect(
      originTypeScopeKey(['PERPS_FEE_CASHBACK', 'SWAPS_FEE_CASHBACK']),
    ).toBe(originTypeScopeKey(['SWAPS_FEE_CASHBACK', 'PERPS_FEE_CASHBACK']));
  });
});

describe('RewardsMoneyController', () => {
  let mockMessenger: jest.Mocked<RewardsMoneyControllerMessenger>;
  let controller: RewardsMoneyController;
  let isDisabled: jest.MockedFunction<() => boolean>;

  beforeEach(() => {
    jest.useFakeTimers();
    isDisabled = jest.fn().mockReturnValue(false);

    mockMessenger = {
      subscribe: jest.fn(),
      call: jest.fn(),
      registerActionHandler: jest.fn(),
      registerMethodActionHandlers: jest.fn(),
      unregisterActionHandler: jest.fn(),
      publish: jest.fn(),
      clearEventSubscriptions: jest.fn(),
      registerInitialEventPayload: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<RewardsMoneyControllerMessenger>;

    controller = new RewardsMoneyController({
      messenger: mockMessenger,
      isDisabled,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('initializes with default state', () => {
      expect(controller.state).toEqual(getRewardsMoneyControllerDefaultState());
    });

    it('registers messenger method handlers', () => {
      expect(mockMessenger.registerMethodActionHandlers).toHaveBeenCalledWith(
        controller,
        expect.arrayContaining([
          'getReferralMe',
          'getReferralFunnel',
          'getReferralCodes',
          'validateReferralCode',
          'getEarningsSummary',
          'getEarningsLedger',
          'getClaimHistory',
          'getClaimById',
          'invalidateRewardsMoneyCache',
          'isRewardsMoneyFeatureEnabled',
          'setRewardsMoneyEnvUrl',
        ]),
      );
    });
  });

  describe('isDisabled gate', () => {
    beforeEach(() => {
      isDisabled.mockReturnValue(true);
      controller = new RewardsMoneyController({
        messenger: mockMessenger,
        isDisabled,
        state: {
          referralMe: {
            payload: mockReferralMe,
            lastFetched: Date.now(),
          },
          earningsSummary: {
            all: { payload: mockSummary, lastFetched: Date.now() },
          },
        },
      });
    });

    it('does not call data service when flag is off for getReferralMe', async () => {
      await expect(controller.getReferralMe()).rejects.toThrow(
        'Rewards Money is disabled',
      );
      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('does not return persisted cache when flag is off', async () => {
      await expect(controller.getEarningsSummary()).rejects.toThrow(
        'Rewards Money is disabled',
      );
      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('returns empty pages for list reads when disabled', async () => {
      await expect(controller.getEarningsLedger()).resolves.toEqual({
        results: [],
        has_more: false,
        cursor: null,
        window: null,
      });
      await expect(controller.getClaimHistory()).resolves.toEqual({
        results: [],
        has_more: false,
        cursor: null,
      });
      await expect(controller.getReferralCodes()).resolves.toEqual({
        codes: [],
      });
      await expect(controller.getReferralFunnel()).resolves.toEqual({
        enrolled: 0,
        earning_generating: 0,
      });
      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('reports feature disabled via isRewardsMoneyFeatureEnabled', () => {
      expect(controller.isRewardsMoneyFeatureEnabled()).toBe(false);
    });
  });

  describe('caching', () => {
    it('caches getReferralMe within TTL', async () => {
      mockMessenger.call.mockResolvedValue(mockReferralMe);

      const first = await controller.getReferralMe();
      const second = await controller.getReferralMe();

      expect(first).toEqual(mockReferralMe);
      expect(second).toEqual(mockReferralMe);
      expect(mockMessenger.call).toHaveBeenCalledTimes(1);
      expect(controller.state.referralMe?.payload).toEqual(mockReferralMe);
    });

    it('refetches getReferralMe after TTL', async () => {
      mockMessenger.call.mockResolvedValue(mockReferralMe);

      await controller.getReferralMe();
      jest.advanceTimersByTime(REFERRAL_ME_CACHE_THRESHOLD_MS + 1);
      await controller.getReferralMe();

      expect(mockMessenger.call).toHaveBeenCalledTimes(2);
    });

    it('forceFresh bypasses TTL', async () => {
      mockMessenger.call.mockResolvedValue(mockReferralMe);

      await controller.getReferralMe();
      await controller.getReferralMe({ forceFresh: true });

      expect(mockMessenger.call).toHaveBeenCalledTimes(2);
    });

    it('caches earnings summary by origin-type scope', async () => {
      mockMessenger.call.mockResolvedValue(mockSummary);

      await controller.getEarningsSummary({
        originTypes: ['SWAPS_FEE_CASHBACK', 'PERPS_FEE_CASHBACK'],
      });
      await controller.getEarningsSummary({
        originTypes: ['PERPS_FEE_CASHBACK', 'SWAPS_FEE_CASHBACK'],
      });

      expect(mockMessenger.call).toHaveBeenCalledTimes(1);
      const key = originTypeScopeKey([
        'SWAPS_FEE_CASHBACK',
        'PERPS_FEE_CASHBACK',
      ]);
      expect(controller.state.earningsSummary[key]?.payload).toEqual(
        mockSummary,
      );
    });

    it('does not persist ledger cursor pages', async () => {
      mockMessenger.call.mockResolvedValue({
        ...mockLedgerPage,
        cursor: 'next',
        has_more: true,
      });

      await controller.getEarningsLedger({ cursor: 'page-2' });

      expect(controller.state.earningsLedgerFirstPage).toEqual({});
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:getEarningsLedger',
        undefined,
        'page-2',
      );
    });

    it('caches ledger first page', async () => {
      mockMessenger.call.mockResolvedValue(mockLedgerPage);

      await controller.getEarningsLedger();
      await controller.getEarningsLedger();

      expect(mockMessenger.call).toHaveBeenCalledTimes(1);
      expect(controller.state.earningsLedgerFirstPage.all?.payload).toEqual(
        mockLedgerPage,
      );
    });

    it('does not persist claim history cursor pages', async () => {
      mockMessenger.call.mockResolvedValue(mockClaimHistory);

      await controller.getClaimHistory({ cursor: 'page-2' });

      expect(controller.state.claimHistoryFirstPage).toBeNull();
    });

    it('caches claim by id and caps the map', async () => {
      mockMessenger.call.mockImplementation((action, ...args): any => {
        if (action === 'RewardsMoneyDataService:getClaimById') {
          const claimId = args[0] as string;
          return Promise.resolve({ ...mockClaim, id: claimId });
        }
        return Promise.resolve(undefined);
      });

      for (let i = 0; i < 25; i++) {
        await controller.getClaimById({ claimId: `claim-${i}` });
        jest.advanceTimersByTime(1);
      }

      expect(
        Object.keys(controller.state.claimById).length,
      ).toBeLessThanOrEqual(20);
    });

    it('invalidateRewardsMoneyCache clears all seven buckets', async () => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        switch (action) {
          case 'RewardsMoneyDataService:getReferralMe':
            return mockReferralMe;
          case 'RewardsMoneyDataService:getReferralFunnel':
            return mockFunnel;
          case 'RewardsMoneyDataService:getReferralCodes':
            return mockCodes;
          case 'RewardsMoneyDataService:getEarningsSummary':
            return mockSummary;
          case 'RewardsMoneyDataService:getEarningsLedger':
            return mockLedgerPage;
          case 'RewardsMoneyDataService:getClaimHistory':
            return mockClaimHistory;
          case 'RewardsMoneyDataService:getClaimById':
            return mockClaim;
          default:
            return undefined;
        }
      });

      await controller.getReferralMe();
      await controller.getReferralFunnel();
      await controller.getReferralCodes();
      await controller.getEarningsSummary();
      await controller.getEarningsLedger();
      await controller.getClaimHistory();
      await controller.getClaimById({ claimId: 'claim-1' });

      controller.invalidateRewardsMoneyCache();

      expect(controller.state.referralMe).toBeNull();
      expect(controller.state.referralCodes).toBeNull();
      expect(controller.state.referralFunnel).toBeNull();
      expect(controller.state.earningsSummary).toEqual({});
      expect(controller.state.earningsLedgerFirstPage).toEqual({});
      expect(controller.state.claimHistoryFirstPage).toBeNull();
      expect(controller.state.claimById).toEqual({});
    });

    it('refetches earnings summary after money TTL', async () => {
      mockMessenger.call.mockResolvedValue(mockSummary);

      await controller.getEarningsSummary();
      jest.advanceTimersByTime(EARNINGS_SUMMARY_CACHE_THRESHOLD_MS + 1);
      await controller.getEarningsSummary();

      expect(mockMessenger.call).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateReferralCode', () => {
    it('forwards to data service when enabled', async () => {
      mockMessenger.call.mockResolvedValue({ success: true });

      await expect(controller.validateReferralCode('ABC')).resolves.toEqual({
        success: true,
      });
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:validateReferralCode',
        'ABC',
      );
    });
  });

  describe('env URL', () => {
    it('persists override and invalidates cache when canChange is true', async () => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'RewardsMoneyDataService:canChangeRewardsMoneyEnvUrl') {
          return true;
        }
        if (action === 'RewardsMoneyDataService:setRewardsMoneyEnvUrl') {
          return undefined;
        }
        return undefined;
      });

      controller = new RewardsMoneyController({
        messenger: mockMessenger,
        isDisabled,
        state: {
          referralMe: { payload: mockReferralMe, lastFetched: Date.now() },
        } as Partial<RewardsMoneyControllerState>,
      });

      await controller.setRewardsMoneyEnvUrl('https://custom.example');

      expect(controller.state.rewardsMoneyEnvUrl).toBe(
        'https://custom.example',
      );
      expect(controller.state.referralMe).toBeNull();
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:setRewardsMoneyEnvUrl',
        'https://custom.example',
      );
    });

    it('ignores set when canChange is false', async () => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'RewardsMoneyDataService:canChangeRewardsMoneyEnvUrl') {
          return false;
        }
        return undefined;
      });

      await controller.setRewardsMoneyEnvUrl('https://custom.example');

      expect(controller.state.rewardsMoneyEnvUrl).toBeNull();
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsMoneyDataService:setRewardsMoneyEnvUrl',
        expect.any(String),
      );
    });
  });

  describe('resetState', () => {
    it('resets to default state', () => {
      controller = new RewardsMoneyController({
        messenger: mockMessenger,
        isDisabled,
        state: {
          referralMe: { payload: mockReferralMe, lastFetched: Date.now() },
          rewardsMoneyEnvUrl: 'https://custom.example',
        },
      });

      controller.resetState();

      expect(controller.state).toEqual(getRewardsMoneyControllerDefaultState());
    });
  });
});

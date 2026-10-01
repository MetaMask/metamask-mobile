/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  RewardsMoneyController,
  getRewardsMoneyControllerDefaultState,
  originTypeScopeKey,
  ledgerScopeKey,
  commissionsScopeKey,
  profileCacheKey,
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
  CommissionsPageDto,
  ReferralFunnelDto,
  ReferralLocalizedText,
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
  // No assertion reads copy keys; the server always sends all of them.
  localized_text: {} as ReferralLocalizedText,
  invite_hero: null,
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
  results: [
    {
      type: 'earning',
      id: 'earn-1',
      earning_origin_type: 'SWAPS_FEE_CASHBACK',
      musd_amount: '10',
      fee_amount_usd: '1',
      entry_count: 1,
      transaction_hash: null,
      chain_id: null,
      ledger_timestamp: '2026-09-10T00:00:00.000Z',
      claim_status: 'UNCLAIMED',
      claim_expires_at: null,
      swaps_source: null,
      perps_source: null,
    },
    {
      type: 'claim',
      id: 'claim-settled-1',
      route: 'REFERRAL_TRADE_FEE_CASHBACK',
      gross_amount: '50',
      net_amount: '50',
      withholding_rate_bps: 0,
      status: 'SETTLED',
      ledger_timestamp: '2026-09-08T14:22:00.000Z',
      settled_at: '2026-09-08T15:00:00.000Z',
    },
  ],
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

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

const sessionProfile = (profileId: string) =>
  Promise.resolve({
    profileId,
    identifierId: 'id',
    canonicalProfileId: profileId,
    metaMetricsId: 'mm',
  });

const dataServiceCalls = (mock: jest.MockedFunction<any>) =>
  mock.mock.calls.filter((call: unknown[]) =>
    String(call[0]).startsWith('RewardsMoneyDataService:'),
  );

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

describe('ledgerScopeKey', () => {
  it('includes the includeClaims flag so cache buckets do not collide', () => {
    expect(ledgerScopeKey(undefined, true)).toBe('all|claims:1');
    expect(ledgerScopeKey(undefined, false)).toBe('all|claims:0');
    expect(ledgerScopeKey(['SWAPS_FEE_CASHBACK'], true)).toBe(
      'SWAPS_FEE_CASHBACK|claims:1',
    );
  });
});

describe('commissionsScopeKey', () => {
  it('separates mechanisms and windows into distinct buckets', () => {
    expect(commissionsScopeKey()).toBe('all|from:default');
    expect(commissionsScopeKey('REFERRAL_REV_SHARE')).toBe(
      'REFERRAL_REV_SHARE|from:default',
    );
    expect(commissionsScopeKey(undefined, '2026-09-01')).toBe(
      'all|from:2026-09-01',
    );
    expect(commissionsScopeKey('SOCIAL_FOLLOW_TRADE', '2026-09-01')).not.toBe(
      commissionsScopeKey('SOCIAL_FOLLOW_TRADE', '2026-08-01'),
    );
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

    mockMessenger.call.mockImplementation((action, ..._args): any => {
      if (action === 'AuthenticationController:getSessionProfile') {
        return sessionProfile(PROFILE_A);
      }
      return undefined;
    });

    controller = new RewardsMoneyController({
      messenger: mockMessenger,
      isDisabled,
    });

    mockMessenger.call.mockClear();
    mockMessenger.call.mockImplementation((action, ..._args): any => {
      if (action === 'AuthenticationController:getSessionProfile') {
        return sessionProfile(PROFILE_A);
      }
      return undefined;
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
          'registerReferee',
          'getEarningsSummary',
          'getEarningsLedger',
          'getClaimHistory',
          'getClaimById',
          'isRewardsMoneyFeatureEnabled',
          'setRewardsMoneyEnvUrl',
        ]),
      );
    });
  });

  describe('profile-keyed cache isolation', () => {
    it('keeps a write under the profile that started the read', async () => {
      let resolveFetch: ((value: ReferralMeDto) => void) | undefined;
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        if (action === 'RewardsMoneyDataService:getReferralMe') {
          return new Promise<ReferralMeDto>((resolve) => {
            resolveFetch = resolve;
          });
        }
        return undefined;
      });

      const pending = controller.getReferralMe({ forceFresh: true });
      // getSessionProfile then getReferralMe — flush until the deferred is set.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(resolveFetch).toBeDefined();

      resolveFetch?.(mockReferralMe);
      await expect(pending).resolves.toEqual(mockReferralMe);
      expect(controller.state.referralMe[PROFILE_A]?.payload).toEqual(
        mockReferralMe,
      );

      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_B);
        }
        if (action === 'RewardsMoneyDataService:getReferralMe') {
          return Promise.resolve({
            ...mockReferralMe,
            role: 'NONE',
            variant: 'NONE',
          });
        }
        return undefined;
      });

      const forB = await controller.getReferralMe();
      expect(forB.role).toBe('NONE');
      expect(controller.state.referralMe[PROFILE_B]?.payload.role).toBe('NONE');
      expect(controller.state.referralMe[PROFILE_A]?.payload).toEqual(
        mockReferralMe,
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
            [PROFILE_A]: { payload: mockReferralMe, lastFetched: Date.now() },
          },
          earningsSummary: {
            [`${PROFILE_A}:all`]: {
              payload: mockSummary,
              lastFetched: Date.now(),
            },
          },
        },
      });
      mockMessenger.call.mockClear();
    });

    it('does not call data service when flag is off for getReferralMe', async () => {
      await expect(controller.getReferralMe()).rejects.toThrow(
        'Rewards Money is disabled',
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        expect.stringMatching(/^RewardsMoneyDataService:/),
      );
    });

    it('does not return persisted cache when flag is off', async () => {
      await expect(controller.getEarningsSummary()).rejects.toThrow(
        'Rewards Money is disabled',
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        expect.stringMatching(/^RewardsMoneyDataService:/),
      );
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
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        expect.stringMatching(/^RewardsMoneyDataService:/),
      );
    });

    it('does not call data service when flag is off for registerReferee', async () => {
      await expect(controller.registerReferee({ code: 'ABC' })).rejects.toThrow(
        'Rewards Money is disabled',
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        expect.stringMatching(/^RewardsMoneyDataService:/),
      );
    });

    it('reports feature disabled via isRewardsMoneyFeatureEnabled', () => {
      expect(controller.isRewardsMoneyFeatureEnabled()).toBe(false);
    });
  });

  describe('caching', () => {
    const withProfileAndData = (dataAction: string, value: unknown) => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        if (action === dataAction) {
          return Promise.resolve(value);
        }
        return undefined;
      });
    };

    it('caches getReferralMe within TTL', async () => {
      withProfileAndData(
        'RewardsMoneyDataService:getReferralMe',
        mockReferralMe,
      );

      const first = await controller.getReferralMe();
      const second = await controller.getReferralMe();

      expect(first).toEqual(mockReferralMe);
      expect(second).toEqual(mockReferralMe);
      expect(dataServiceCalls(mockMessenger.call)).toHaveLength(1);
      expect(controller.state.referralMe[PROFILE_A]?.payload).toEqual(
        mockReferralMe,
      );
    });

    it('refetches getReferralMe after TTL', async () => {
      withProfileAndData(
        'RewardsMoneyDataService:getReferralMe',
        mockReferralMe,
      );

      await controller.getReferralMe();
      jest.advanceTimersByTime(REFERRAL_ME_CACHE_THRESHOLD_MS + 1);
      await controller.getReferralMe();

      expect(dataServiceCalls(mockMessenger.call)).toHaveLength(2);
    });

    it('forceFresh bypasses TTL', async () => {
      withProfileAndData(
        'RewardsMoneyDataService:getReferralMe',
        mockReferralMe,
      );

      await controller.getReferralMe();
      await controller.getReferralMe({ forceFresh: true });

      expect(dataServiceCalls(mockMessenger.call)).toHaveLength(2);
    });

    it('keeps the later forceFresh result when an older normal fetch resolves last', async () => {
      const requestResolvers: ((value: ReferralMeDto) => void)[] = [];
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        if (action === 'RewardsMoneyDataService:getReferralMe') {
          return new Promise<ReferralMeDto>((resolve) => {
            requestResolvers.push(resolve);
          });
        }
        return undefined;
      });
      const none = {
        ...mockReferralMe,
        role: 'NONE',
        variant: 'NONE',
      } as const;
      const referee = {
        ...mockReferralMe,
        role: 'REFEREE',
        variant: 'REFEREE',
      } as const;

      const normal = controller.getReferralMe();
      await Promise.resolve();
      await Promise.resolve();
      const forceFresh = controller.getReferralMe({ forceFresh: true });
      await Promise.resolve();
      await Promise.resolve();
      expect(requestResolvers).toHaveLength(2);

      requestResolvers[1](referee);
      await expect(forceFresh).resolves.toEqual(referee);
      requestResolvers[0](none);
      await expect(normal).resolves.toEqual(none);

      expect(controller.state.referralMe[PROFILE_A]?.payload).toEqual(referee);
    });

    it('caches earnings summary by origin-type scope', async () => {
      withProfileAndData(
        'RewardsMoneyDataService:getEarningsSummary',
        mockSummary,
      );

      await controller.getEarningsSummary({
        originTypes: ['SWAPS_FEE_CASHBACK', 'PERPS_FEE_CASHBACK'],
      });
      await controller.getEarningsSummary({
        originTypes: ['PERPS_FEE_CASHBACK', 'SWAPS_FEE_CASHBACK'],
      });

      expect(dataServiceCalls(mockMessenger.call)).toHaveLength(1);
      const key = profileCacheKey(
        PROFILE_A,
        originTypeScopeKey(['SWAPS_FEE_CASHBACK', 'PERPS_FEE_CASHBACK']),
      );
      expect(controller.state.earningsSummary[key]?.payload).toEqual(
        mockSummary,
      );
    });

    it('does not persist ledger cursor pages', async () => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        if (action === 'RewardsMoneyDataService:getEarningsLedger') {
          return Promise.resolve({
            ...mockLedgerPage,
            cursor: 'next',
            has_more: true,
          });
        }
        return undefined;
      });

      await controller.getEarningsLedger({ cursor: 'page-2' });

      expect(controller.state.earningsLedgerFirstPage).toEqual({});
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:getEarningsLedger',
        undefined,
        'page-2',
        undefined,
        true,
      );
    });

    it('caches ledger first page under the unified-history key', async () => {
      withProfileAndData(
        'RewardsMoneyDataService:getEarningsLedger',
        mockLedgerPage,
      );

      await controller.getEarningsLedger();
      await controller.getEarningsLedger();

      expect(dataServiceCalls(mockMessenger.call)).toHaveLength(1);
      const key = profileCacheKey(PROFILE_A, ledgerScopeKey(undefined, true));
      expect(controller.state.earningsLedgerFirstPage[key]?.payload).toEqual(
        mockLedgerPage,
      );
    });

    it('caches accrual-only ledger separately when includeClaims is false', async () => {
      withProfileAndData('RewardsMoneyDataService:getEarningsLedger', {
        ...mockLedgerPage,
        results: mockLedgerPage.results.filter((row) => row.type === 'earning'),
      });

      await controller.getEarningsLedger({ includeClaims: false });

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:getEarningsLedger',
        undefined,
        null,
        undefined,
        false,
      );
      const key = profileCacheKey(PROFILE_A, ledgerScopeKey(undefined, false));
      expect(
        controller.state.earningsLedgerFirstPage[key]?.payload.results,
      ).toHaveLength(1);
    });

    it('does not persist claim history cursor pages', async () => {
      withProfileAndData(
        'RewardsMoneyDataService:getClaimHistory',
        mockClaimHistory,
      );

      await controller.getClaimHistory({ cursor: 'page-2' });

      expect(controller.state.claimHistoryFirstPage).toEqual({});
    });

    it('caches claim by id and caps the map', async () => {
      mockMessenger.call.mockImplementation((action, ...args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
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

    it('refetches earnings summary after money TTL', async () => {
      withProfileAndData(
        'RewardsMoneyDataService:getEarningsSummary',
        mockSummary,
      );

      await controller.getEarningsSummary();
      jest.advanceTimersByTime(EARNINGS_SUMMARY_CACHE_THRESHOLD_MS + 1);
      await controller.getEarningsSummary();

      expect(dataServiceCalls(mockMessenger.call)).toHaveLength(2);
    });
  });

  describe('validateReferralCode', () => {
    it('forwards to data service when enabled', async () => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        if (action === 'RewardsMoneyDataService:validateReferralCode') {
          return Promise.resolve({ success: true });
        }
        return undefined;
      });

      await expect(controller.validateReferralCode('ABC')).resolves.toEqual({
        success: true,
      });
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:validateReferralCode',
        'ABC',
      );
    });
  });

  describe('registerReferee', () => {
    it('forwards the code to the data service when enabled', async () => {
      const registerReferee = jest.fn().mockResolvedValue(undefined);
      mockMessenger.call.mockImplementation((action, ...args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        if (action === 'RewardsMoneyDataService:registerReferee') {
          return registerReferee(args[0]);
        }
        return undefined;
      });

      await expect(
        controller.registerReferee({ code: 'KOL1' }),
      ).resolves.toBeUndefined();

      expect(registerReferee).toHaveBeenCalledWith({ code: 'KOL1' });
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:registerReferee',
        { code: 'KOL1' },
      );
    });

    it('does not write any controller cache for a register', async () => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        return undefined;
      });

      await controller.registerReferee({ code: 'KOL1' });

      expect(controller.state).toEqual(getRewardsMoneyControllerDefaultState());
    });
  });

  describe('env URL', () => {
    it('persists override and invalidates cache when canChange is true', async () => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
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
          referralMe: {
            [PROFILE_A]: { payload: mockReferralMe, lastFetched: Date.now() },
          },
        } as Partial<RewardsMoneyControllerState>,
      });

      await controller.setRewardsMoneyEnvUrl('https://custom.example');

      expect(controller.state.rewardsMoneyEnvUrl).toBe(
        'https://custom.example',
      );
      expect(controller.state.referralMe).toEqual({});
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
        expect.anything(),
      );
    });
  });

  describe('getCommissions', () => {
    const mockCommissions: CommissionsPageDto = {
      results: [
        {
          id: 'commission-1',
          earning_origin_type: 'REFERRAL_REV_SHARE',
          day: '2026-09-16',
          token: { key: 'perps:BTC', symbol: 'BTC', source: 'PERPS' },
          musd_amount: '1000000',
          fee_amount_usd: '12.34567890',
          fill_count: 4,
          copied_times: 3,
        },
      ],
      mechanisms: {
        REFERRAL_REV_SHARE: { claim_open: true, reason: null },
        SOCIAL_FOLLOW_TRADE: {
          claim_open: false,
          reason: 'MECHANISM_NOT_CLAIMABLE',
        },
      },
      has_more: true,
      cursor: 'next-commissions',
    };

    beforeEach(() => {
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return sessionProfile(PROFILE_A);
        }
        if (action === 'RewardsMoneyDataService:getCommissions') {
          return Promise.resolve(mockCommissions);
        }
        return undefined;
      });
    });

    it('caches the first page under the profile and scope key', async () => {
      await expect(
        controller.getCommissions({ originType: 'REFERRAL_REV_SHARE' }),
      ).resolves.toEqual(mockCommissions);

      const key = `${PROFILE_A}:${commissionsScopeKey('REFERRAL_REV_SHARE')}`;
      expect(controller.state.commissionsFirstPage[key].payload).toEqual(
        mockCommissions,
      );
    });

    it('serves a repeat read from cache without refetching', async () => {
      await controller.getCommissions();
      await controller.getCommissions();

      expect(
        dataServiceCalls(mockMessenger.call).filter(
          (call: unknown[]) =>
            call[0] === 'RewardsMoneyDataService:getCommissions',
        ),
      ).toHaveLength(1);
    });

    it('keeps separate mechanisms in separate buckets', async () => {
      await controller.getCommissions({ originType: 'REFERRAL_REV_SHARE' });
      await controller.getCommissions({ originType: 'SOCIAL_FOLLOW_TRADE' });

      expect(Object.keys(controller.state.commissionsFirstPage)).toHaveLength(
        2,
      );
    });

    it('does not cache cursor pages', async () => {
      await controller.getCommissions({ cursor: 'next-commissions' });

      expect(controller.state.commissionsFirstPage).toEqual({});
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsMoneyDataService:getCommissions',
        undefined,
        'next-commissions',
        undefined,
        undefined,
      );
    });

    it('returns an empty page with both mechanisms closed when disabled', async () => {
      isDisabled.mockReturnValue(true);

      const page = await controller.getCommissions();

      expect(page.results).toEqual([]);
      expect(page.mechanisms.REFERRAL_REV_SHARE.claim_open).toBe(false);
      expect(page.mechanisms.SOCIAL_FOLLOW_TRADE.claim_open).toBe(false);
      expect(
        dataServiceCalls(mockMessenger.call).filter(
          (call: unknown[]) =>
            call[0] === 'RewardsMoneyDataService:getCommissions',
        ),
      ).toHaveLength(0);
    });
  });
});

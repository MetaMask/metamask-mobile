import { Messenger } from '@metamask/messenger';
import { deriveStateFromMetadata } from '@metamask/base-controller';
import {
  RewardsMoneyController,
  applyOptimisticClaim,
  originTypeScopeKey,
  OPTIMISTIC_CLAIM_TTL_MS,
  REFERRAL_ME_CACHE_THRESHOLD_MS,
} from './RewardsMoneyController';
import { getRewardsMoneyControllerDefaultState } from './defaultState';
import type {
  EarningsLedgerPageDto,
  EarningsSummaryDto,
  ReferralMeDto,
  RewardsMoneyControllerState,
} from './types';
import type { RewardsMoneyControllerMessenger } from '../../messengers/rewards-money-controller-messenger';
import type { RewardsMoneyDataServiceActions } from './services';

const createReferralMe = (
  overrides: Partial<ReferralMeDto> = {},
): ReferralMeDto => ({
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: null,
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: 2500,
    cashback_rate_bps: 50,
    earning_term_days: 90,
  },
  ...overrides,
});

const createSummary = (
  overrides: Partial<EarningsSummaryDto> = {},
): EarningsSummaryDto => ({
  lifetime_total: '0',
  claimable: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '10000000',
  by_earning_origin_type: {},
  ...overrides,
});

const createLedgerPage = (
  overrides: Partial<EarningsLedgerPageDto> = {},
): EarningsLedgerPageDto => ({
  results: [],
  has_more: false,
  cursor: null,
  ...overrides,
});

interface Harness {
  controller: RewardsMoneyController;
  messenger: RewardsMoneyControllerMessenger;
  handlers: {
    getReferralMe: jest.Mock;
    getEarningsSummary: jest.Mock;
    getEarningsLedger: jest.Mock;
    initiateClaim: jest.Mock;
  };
}

const createHarness = ({
  state,
  isDisabled,
}: {
  state?: Partial<RewardsMoneyControllerState>;
  isDisabled?: () => boolean;
} = {}): Harness => {
  const rootMessenger = new Messenger<
    'Root',
    RewardsMoneyDataServiceActions,
    never
  >({ namespace: 'Root' });

  const handlers = {
    getReferralMe: jest.fn().mockResolvedValue(createReferralMe()),
    getEarningsSummary: jest.fn().mockResolvedValue(createSummary()),
    getEarningsLedger: jest.fn().mockResolvedValue(createLedgerPage()),
    initiateClaim: jest.fn().mockResolvedValue({
      claim: {},
      voucher: null,
      excluded: [],
      status: 'OPENED',
    }),
  };

  // Handlers must be registered on a messenger whose namespace matches the
  // action prefix, exactly as the real data service does.
  const dataServiceMessenger = new Messenger<
    'RewardsMoneyDataService',
    RewardsMoneyDataServiceActions,
    never,
    typeof rootMessenger
  >({
    namespace: 'RewardsMoneyDataService',
    parent: rootMessenger,
  });
  dataServiceMessenger.registerActionHandler(
    'RewardsMoneyDataService:getReferralMe',
    handlers.getReferralMe,
  );
  dataServiceMessenger.registerActionHandler(
    'RewardsMoneyDataService:getEarningsSummary',
    handlers.getEarningsSummary,
  );
  dataServiceMessenger.registerActionHandler(
    'RewardsMoneyDataService:getEarningsLedger',
    handlers.getEarningsLedger,
  );
  dataServiceMessenger.registerActionHandler(
    'RewardsMoneyDataService:initiateClaim',
    handlers.initiateClaim,
  );

  const messenger = new Messenger<
    'RewardsMoneyController',
    never,
    never,
    typeof rootMessenger
  >({
    namespace: 'RewardsMoneyController',
    parent: rootMessenger,
  }) as unknown as RewardsMoneyControllerMessenger;

  rootMessenger.delegate({
    messenger: messenger as never,
    actions: [
      'RewardsMoneyDataService:getReferralMe',
      'RewardsMoneyDataService:getEarningsSummary',
      'RewardsMoneyDataService:getEarningsLedger',
      'RewardsMoneyDataService:initiateClaim',
    ],
    events: [],
  } as never);

  const controller = new RewardsMoneyController({
    messenger,
    state,
    isDisabled,
  });

  return { controller, messenger, handlers };
};

describe('originTypeScopeKey', () => {
  it('returns "all" for an omitted scope so it never collides with an empty key', () => {
    expect(originTypeScopeKey(undefined)).toBe('all');
  });

  it('returns "all" for an empty scope', () => {
    expect(originTypeScopeKey([])).toBe('all');
  });

  it('sorts the scope so member order does not create a second cache entry', () => {
    expect(originTypeScopeKey(['REFERRAL_REV_SHARE', 'CASHBACK'])).toBe(
      originTypeScopeKey(['CASHBACK', 'REFERRAL_REV_SHARE']),
    );
  });
});

describe('applyOptimisticClaim', () => {
  it('never drives claimable below zero when the claim exceeds it', () => {
    const summary = createSummary({ claimable: '5000000', claimed: '0' });

    const result = applyOptimisticClaim(summary, {
      netAmount: '12500000',
      originTypes: ['CASHBACK'],
      baselineClaimed: '0',
      expiresAt: Number.MAX_SAFE_INTEGER,
    });

    expect(result.claimable).toBe('0');
    expect(result.claimed).toBe('5000000');
  });

  it('leaves per-type figures untouched, since a net cannot be decomposed', () => {
    const summary = createSummary({
      claimable: '12500000',
      by_earning_origin_type: {
        CASHBACK: {
          lifetime: '1',
          claimable: '12500000',
          pending: '0',
          claimed: '0',
          forfeited: '0',
          blocking_reason: null,
        },
      },
    });

    const result = applyOptimisticClaim(summary, {
      netAmount: '12500000',
      originTypes: ['CASHBACK'],
      baselineClaimed: '0',
      expiresAt: Number.MAX_SAFE_INTEGER,
    });

    expect(result.by_earning_origin_type).toStrictEqual(
      summary.by_earning_origin_type,
    );
  });
});

describe('RewardsMoneyController', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('state metadata', () => {
    it('persists every cache bucket', () => {
      const { controller } = createHarness();

      const persisted = deriveStateFromMetadata(
        controller.state,
        controller.metadata,
        'persist',
      );

      expect(Object.keys(persisted).sort()).toStrictEqual([
        'earningsLedgerFirstPage',
        'earningsSummary',
        'optimisticClaim',
        'referralMe',
      ]);
    });

    it('keeps every bucket out of state logs and debug snapshots', () => {
      const { controller } = createHarness();

      const inLogs = deriveStateFromMetadata(
        controller.state,
        controller.metadata,
        'includeInStateLogs',
      );

      expect(inLogs).toStrictEqual({});
    });
  });

  describe('getReferralMe', () => {
    it('returns the fetched payload and writes it to state', async () => {
      const { controller, handlers } = createHarness();

      const result = await controller.getReferralMe();

      expect(handlers.getReferralMe).toHaveBeenCalledTimes(1);
      expect(controller.state.referralMe?.payload).toStrictEqual(result);
    });

    it('serves a second read inside the TTL from cache', async () => {
      const { controller, handlers } = createHarness();

      await controller.getReferralMe();
      await controller.getReferralMe();

      expect(handlers.getReferralMe).toHaveBeenCalledTimes(1);
    });

    it('refetches when forceFresh is set', async () => {
      const { controller, handlers } = createHarness();

      await controller.getReferralMe();
      await controller.getReferralMe({ forceFresh: true });

      expect(handlers.getReferralMe).toHaveBeenCalledTimes(2);
    });

    it('refetches once the cache entry is older than the TTL', async () => {
      const { controller, handlers } = createHarness({
        state: {
          referralMe: {
            payload: createReferralMe(),
            lastFetched: Date.now() - REFERRAL_ME_CACHE_THRESHOLD_MS - 1,
          },
        },
      });

      await controller.getReferralMe();

      expect(handlers.getReferralMe).toHaveBeenCalledTimes(1);
    });

    it('throws when the feature is disabled', async () => {
      const { controller } = createHarness({ isDisabled: () => true });

      await expect(controller.getReferralMe()).rejects.toThrow(
        'Rewards Money is disabled',
      );
    });
  });

  describe('getEarningsSummary', () => {
    it('passes the origin-type scope through to the data service', async () => {
      const { controller, handlers } = createHarness();

      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });

      expect(handlers.getEarningsSummary).toHaveBeenCalledWith(['CASHBACK']);
    });

    it('caches separate scopes under separate keys', async () => {
      const { controller, handlers } = createHarness();

      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });
      await controller.getEarningsSummary({
        originTypes: ['CASHBACK', 'REFERRAL_REV_SHARE'],
      });

      expect(handlers.getEarningsSummary).toHaveBeenCalledTimes(2);
      expect(
        Object.keys(controller.state.earningsSummary).sort(),
      ).toStrictEqual(['CASHBACK', 'CASHBACK,REFERRAL_REV_SHARE']);
    });

    it('serves a repeat read of the same scope from cache', async () => {
      const { controller, handlers } = createHarness();

      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });
      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });

      expect(handlers.getEarningsSummary).toHaveBeenCalledTimes(1);
    });

    it('refetches when forceFresh is set', async () => {
      const { controller, handlers } = createHarness();

      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });
      await controller.getEarningsSummary({
        originTypes: ['CASHBACK'],
        forceFresh: true,
      });

      expect(handlers.getEarningsSummary).toHaveBeenCalledTimes(2);
    });

    it('throws when the feature is disabled', async () => {
      const { controller } = createHarness({ isDisabled: () => true });

      await expect(controller.getEarningsSummary()).rejects.toThrow(
        'Rewards Money is disabled',
      );
    });
  });

  describe('getEarningsLedger', () => {
    it('caches page 1 and serves a repeat read from state', async () => {
      const { controller, handlers } = createHarness();

      await controller.getEarningsLedger({ originTypes: ['CASHBACK'] });
      await controller.getEarningsLedger({ originTypes: ['CASHBACK'] });

      expect(handlers.getEarningsLedger).toHaveBeenCalledTimes(1);
      expect(controller.state.earningsLedgerFirstPage.CASHBACK).toBeDefined();
    });

    it('sends a cursor page straight to the network', async () => {
      const { controller, handlers } = createHarness();

      await controller.getEarningsLedger({
        originTypes: ['CASHBACK'],
        cursor: 'cursor-1',
      });

      expect(handlers.getEarningsLedger).toHaveBeenCalledWith(
        ['CASHBACK'],
        'cursor-1',
      );
    });

    it('never writes a cursor page to state', async () => {
      const { controller } = createHarness();

      await controller.getEarningsLedger({
        originTypes: ['CASHBACK'],
        cursor: 'cursor-1',
      });

      expect(controller.state.earningsLedgerFirstPage).toStrictEqual({});
    });

    it('refetches page 1 and rewrites state when forceFresh is set', async () => {
      const { controller, handlers } = createHarness();

      await controller.getEarningsLedger({ originTypes: ['CASHBACK'] });
      await controller.getEarningsLedger({
        originTypes: ['CASHBACK'],
        forceFresh: true,
      });

      expect(handlers.getEarningsLedger).toHaveBeenCalledTimes(2);
      expect(controller.state.earningsLedgerFirstPage.CASHBACK).toBeDefined();
    });

    it('returns an empty page rather than throwing when disabled', async () => {
      const { controller } = createHarness({ isDisabled: () => true });

      const result = await controller.getEarningsLedger();

      expect(result).toStrictEqual({
        results: [],
        has_more: false,
        cursor: null,
      });
    });
  });

  describe('initiateClaim', () => {
    it('passes the address and scope through to the data service', async () => {
      const { controller, handlers } = createHarness();

      await controller.initiateClaim({
        moneyAccountAddress: '0xabc',
        originTypes: ['CASHBACK'],
      });

      expect(handlers.initiateClaim).toHaveBeenCalledWith('0xabc', [
        'CASHBACK',
      ]);
    });

    it('throws when the feature is disabled', async () => {
      const { controller } = createHarness({ isDisabled: () => true });

      await expect(
        controller.initiateClaim({
          moneyAccountAddress: '0xabc',
          originTypes: ['CASHBACK'],
        }),
      ).rejects.toThrow('Rewards Money is disabled');
    });

    it('drops every cached total, because the claim has stamped its accruals', async () => {
      const { controller } = createHarness();
      await controller.getReferralMe();
      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });

      await controller.initiateClaim({
        moneyAccountAddress: '0xabc',
        originTypes: ['CASHBACK'],
      });

      expect(controller.state).toStrictEqual(
        getRewardsMoneyControllerDefaultState(),
      );
    });
  });

  describe('recordOptimisticClaim', () => {
    it('holds the post-claim figure instead of the server total the reconciler has not updated yet', async () => {
      const { controller, handlers } = createHarness();
      handlers.getEarningsSummary.mockResolvedValue(
        createSummary({ claimable: '12500000', claimed: '0' }),
      );
      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });

      controller.recordOptimisticClaim({
        netAmount: '12500000',
        originTypes: ['CASHBACK'],
      });
      const after = await controller.getEarningsSummary({
        originTypes: ['CASHBACK'],
        forceFresh: true,
      });

      expect(after.claimable).toBe('0');
      expect(after.claimed).toBe('12500000');
    });

    it('drops the overlay once the server reports the claim', async () => {
      const { controller, handlers } = createHarness();
      handlers.getEarningsSummary.mockResolvedValue(
        createSummary({ claimable: '12500000', claimed: '0' }),
      );
      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });
      controller.recordOptimisticClaim({
        netAmount: '12500000',
        originTypes: ['CASHBACK'],
      });

      handlers.getEarningsSummary.mockResolvedValue(
        createSummary({ claimable: '0', claimed: '12500000' }),
      );
      const after = await controller.getEarningsSummary({
        originTypes: ['CASHBACK'],
        forceFresh: true,
      });

      expect(after.claimed).toBe('12500000');
      expect(controller.state.optimisticClaim).toBeNull();
    });

    it('drops the overlay once its TTL has passed', async () => {
      const { controller, handlers } = createHarness();
      handlers.getEarningsSummary.mockResolvedValue(
        createSummary({ claimable: '12500000', claimed: '0' }),
      );
      controller.recordOptimisticClaim({
        netAmount: '12500000',
        originTypes: ['CASHBACK'],
      });
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + OPTIMISTIC_CLAIM_TTL_MS + 1);

      const after = await controller.getEarningsSummary({
        originTypes: ['CASHBACK'],
        forceFresh: true,
      });

      expect(after.claimable).toBe('12500000');
      expect(controller.state.optimisticClaim).toBeNull();
    });

    it('leaves a scope the claim did not touch alone', async () => {
      const { controller, handlers } = createHarness();
      handlers.getEarningsSummary.mockResolvedValue(
        createSummary({ claimable: '8000000', claimed: '0' }),
      );
      controller.recordOptimisticClaim({
        netAmount: '12500000',
        originTypes: ['CASHBACK'],
      });

      const after = await controller.getEarningsSummary({
        originTypes: ['REFERRAL_REV_SHARE'],
        forceFresh: true,
      });

      expect(after.claimable).toBe('8000000');
    });

    it('survives a cache flush, which is when the server is most likely to lag', async () => {
      const { controller } = createHarness();
      controller.recordOptimisticClaim({
        netAmount: '12500000',
        originTypes: ['CASHBACK'],
      });

      controller.invalidateRewardsMoneyCache();

      expect(controller.state.optimisticClaim).not.toBeNull();
    });
  });

  describe('invalidateRewardsMoneyCache', () => {
    it('clears every bucket so nothing leaks across an identity switch', async () => {
      const { controller } = createHarness();
      await controller.getReferralMe();
      await controller.getEarningsSummary({ originTypes: ['CASHBACK'] });
      await controller.getEarningsLedger({ originTypes: ['CASHBACK'] });

      controller.invalidateRewardsMoneyCache();

      expect(controller.state).toStrictEqual(
        getRewardsMoneyControllerDefaultState(),
      );
      expect(controller.state.optimisticClaim).toBeNull();
    });
  });

  describe('notifyEarningsUpdated', () => {
    it('publishes earningsUpdated so open screens re-query', () => {
      const { controller, messenger } = createHarness();
      const subscriber = jest.fn();
      messenger.subscribe('RewardsMoneyController:earningsUpdated', subscriber);

      controller.notifyEarningsUpdated();

      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetState', () => {
    it('returns state to the default shape', async () => {
      const { controller } = createHarness();
      await controller.getReferralMe();

      controller.resetState();

      expect(controller.state).toStrictEqual(
        getRewardsMoneyControllerDefaultState(),
      );
    });
  });

  it('still returns the payload when writing the referral cache throws', async () => {
    const { controller } = createHarness();
    jest.spyOn(controller, 'update' as never).mockImplementation(() => {
      throw new Error('state write failed');
    });

    const result = await controller.getReferralMe({ forceFresh: true });

    expect(result.role).toBe('REFERRER');
  });

  it('exposes its methods as messenger actions', async () => {
    const { messenger, handlers } = createHarness();

    await messenger.call('RewardsMoneyController:getReferralMe', {});

    expect(handlers.getReferralMe).toHaveBeenCalledTimes(1);
  });
});

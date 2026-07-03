import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  PerpsControllerState,
  InitializationState,
  MARKET_SORTING_CONFIG,
  PerpsPlatformDependencies,
} from '@metamask/perps-controller';
import { perpsControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { getPerpsControllerMessenger } from '../../messengers/perps-controller-messenger';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';

// Mock mobile-specific modules that ./index.ts imports to avoid pulling in
// Engine and React Native dependencies in the test environment
jest.mock(
  '../../../../components/UI/Perps/adapters/mobileInfrastructure',
  () => ({
    createMobileInfrastructure: jest.fn(() => ({})),
    createMobileClientConfig: jest.fn(() => ({})),
  }),
);
jest.mock('../../../../components/UI/Perps/utils/e2eBridgePerps', () => ({
  applyE2EControllerMocks: jest.fn(),
}));

jest.mock('@metamask/perps-controller', () => {
  const actualPerpsController = jest.requireActual(
    '@metamask/perps-controller/PerpsController',
  );
  const actualUtils = jest.requireActual('@metamask/perps-controller/utils');
  const actualConstants = jest.requireActual(
    '@metamask/perps-controller/constants',
  );

  return {
    controllerName: actualPerpsController.controllerName,
    getDefaultPerpsControllerState:
      actualPerpsController.getDefaultPerpsControllerState,
    InitializationState: actualPerpsController.InitializationState,
    PerpsController: jest.fn(),
    parseCommaSeparatedString: actualUtils.parseCommaSeparatedString,
    MARKET_SORTING_CONFIG: actualConstants.MARKET_SORTING_CONFIG,
  };
});

describe('perps controller init', () => {
  const perpsControllerClassMock = jest.mocked(PerpsController);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<PerpsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    // Create messenger client init request mock
    initRequestMock = buildMessengerClientInitRequestMock(
      baseControllerMessenger,
    );

    // Mock getState to return proper Redux state structure for feature flags
    // Using Partial since we only need RemoteFeatureFlagController for this test
    initRequestMock.getState.mockReturnValue({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {},
            cacheTimestamp: 0,
          },
        } as Partial<
          ReturnType<
            typeof initRequestMock.getState
          >['engine']['backgroundState']
        >,
      },
    } as ReturnType<typeof initRequestMock.getState>);
  });

  it('returns controller instance', () => {
    expect(perpsControllerInit(initRequestMock).controller).toBeInstanceOf(
      PerpsController,
    );
  });

  it('controller state should be default state when no initial state is passed in', () => {
    const defaultPerpsControllerState = jest
      .requireActual('@metamask/perps-controller/PerpsController')
      .getDefaultPerpsControllerState();

    perpsControllerInit(initRequestMock);

    const perpsControllerState =
      perpsControllerClassMock.mock.calls[0][0].state;

    expect(perpsControllerState).toEqual(defaultPerpsControllerState);
  });

  it('controller state should be initial state when initial state is passed in', () => {
    const initialPerpsControllerState: PerpsControllerState = {
      activeProvider: 'hyperliquid',
      isTestnet: true,
      accountState: null,
      perpsBalances: {},
      depositInProgress: false,
      lastDepositTransactionId: null,
      lastDepositResult: null,
      lastError: null,
      lastUpdateTimestamp: Date.now(),
      isEligible: false,
      isFirstTimeUser: {
        testnet: true,
        mainnet: true,
      },
      hasPlacedFirstOrder: {
        testnet: false,
        mainnet: false,
      },
      watchlistMarkets: {
        testnet: [],
        mainnet: [],
      },
      tradeConfigurations: {
        testnet: {},
        mainnet: {},
      },
      marketFilterPreferences: {
        optionId: MARKET_SORTING_CONFIG.DefaultSortOptionId,
        direction: MARKET_SORTING_CONFIG.DefaultDirection,
      },
      hip3ConfigVersion: 0,
      withdrawInProgress: false,
      lastWithdrawResult: null,
      lastCompletedWithdrawalTimestamp: null,
      lastCompletedWithdrawalTxHashes: [],
      withdrawalRequests: [],
      withdrawalProgress: {
        progress: 0,
        lastUpdated: Date.now(),
        activeWithdrawalId: null,
      },
      depositRequests: [],
      initializationState: InitializationState.Uninitialized,
      initializationError: null,
      initializationAttempts: 0,
      selectedPaymentToken: null,
      cachedMarketDataByProvider: {},
      cachedUserDataByProvider: {},
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      PerpsController: initialPerpsControllerState,
    };

    perpsControllerInit(initRequestMock);

    const perpsControllerState =
      perpsControllerClassMock.mock.calls[0][0].state;

    expect(perpsControllerState).toStrictEqual(initialPerpsControllerState);
  });
});

// ---------------------------------------------------------------------------
// Integration: watchlist ↔ AuthenticatedUserStorageService
//
// The describe block above mocks PerpsController as jest.fn() (needed to test
// the init wiring).  These tests need the real controller, so they use
// jest.requireActual to reach the preview build directly.
// ---------------------------------------------------------------------------

function buildSeedPrefs(
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences {
  return {
    walletActivity: {
      inAppNotificationsEnabled: false,
      pushNotificationsEnabled: false,
      accounts: [],
    },
    marketing: {
      inAppNotificationsEnabled: false,
      pushNotificationsEnabled: false,
    },
    perps: {
      inAppNotificationsEnabled: false,
      pushNotificationsEnabled: false,
      watchlistMarkets: {
        hyperliquid: { testnet: [], mainnet: [] },
        myx: { testnet: [], mainnet: [] },
      },
    },
    agenticCli: {
      inAppNotificationsEnabled: false,
      pushNotificationsEnabled: false,
    },
    priceAlerts: {
      inAppNotificationsEnabled: false,
      pushNotificationsEnabled: false,
    },
    socialAI: {
      inAppNotificationsEnabled: false,
      pushNotificationsEnabled: false,
      mutedTraderProfileIds: [],
    },
    ...overrides,
  };
}

function buildTestInfrastructure(): PerpsPlatformDependencies {
  return {
    logger: { error: jest.fn() },
    debugLogger: { log: jest.fn() },
    metrics: { isEnabled: jest.fn(() => false), trackPerpsEvent: jest.fn() },
    performance: { now: jest.fn(() => 0) },
    streamManager: {
      pauseChannel: jest.fn(),
      resumeChannel: jest.fn(),
      clearAllChannels: jest.fn(),
    },
    featureFlags: { validateVersionGated: jest.fn(() => false) },
    marketDataFormatters: {
      formatVolume: jest.fn(() => ''),
      formatPerpsFiat: jest.fn(() => ''),
      formatPercentage: jest.fn(() => ''),
      priceRangesUniversal: [],
    },
    cacheInvalidator: { invalidate: jest.fn(), invalidateAll: jest.fn() },
    diskCache: {
      // Called synchronously in the constructor (#hydrateCacheFromDiskSync).
      getItemSync: jest.fn(() => null),
      getItem: jest.fn(() => Promise.resolve(null)),
      setItem: jest.fn(() => Promise.resolve()),
      removeItem: jest.fn(() => Promise.resolve()),
    },
    tracer: {
      trace: jest.fn(),
      endTrace: jest.fn(),
      setMeasurement: jest.fn(),
      addBreadcrumb: jest.fn(),
    },
    rewards: { getPerpsDiscountForAccount: jest.fn(() => Promise.resolve(0)) },
  };
}

interface GetNotificationPreferencesAction {
  type: 'AuthenticatedUserStorageService:getNotificationPreferences';
  handler: () => Promise<NotificationPreferences | null>;
}

interface PutNotificationPreferencesAction {
  type: 'AuthenticatedUserStorageService:putNotificationPreferences';
  handler: (prefs: NotificationPreferences) => Promise<void>;
}

function buildRealController(
  getNotificationPreferencesImpl: () => Promise<NotificationPreferences | null>,
) {
  // Use the real PerpsController from the preview build — the top-level
  // jest.mock replaces it with jest.fn() for the init tests above, so we
  // reach through with requireActual here.
  const {
    PerpsController: RealPerpsController,
    getDefaultPerpsControllerState,
  } = jest.requireActual('@metamask/perps-controller/PerpsController') as {
    PerpsController: typeof PerpsController;
    getDefaultPerpsControllerState: () => PerpsControllerState;
  };

  const baseMessenger = new ExtendedMessenger<
    MockAnyNamespace,
    GetNotificationPreferencesAction | PutNotificationPreferencesAction
  >({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const getSpy = jest.fn().mockImplementation(getNotificationPreferencesImpl);
  const putSpy = jest.fn().mockResolvedValue(undefined);

  baseMessenger.registerActionHandler(
    'AuthenticatedUserStorageService:getNotificationPreferences',
    getSpy,
  );
  baseMessenger.registerActionHandler(
    'AuthenticatedUserStorageService:putNotificationPreferences',
    putSpy,
  );

  const controllerMessenger = getPerpsControllerMessenger(baseMessenger);

  const controller = new RealPerpsController({
    messenger: controllerMessenger,
    state: getDefaultPerpsControllerState(),
    infrastructure: buildTestInfrastructure(),
    clientConfig: {},
  });

  return { controller, getSpy, putSpy };
}

describe('PerpsController watchlist ↔ AuthenticatedUserStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toggleWatchlistMarket — add', () => {
    it('calls putNotificationPreferences with the new symbol in hyperliquid.mainnet', async () => {
      const { controller, putSpy } = buildRealController(() =>
        Promise.resolve(buildSeedPrefs()),
      );

      await controller.toggleWatchlistMarket('BTC');

      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(putSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          perps: expect.objectContaining({
            watchlistMarkets: expect.objectContaining({
              hyperliquid: expect.objectContaining({
                mainnet: expect.arrayContaining(['BTC']),
              }),
            }),
          }),
        }),
      );
    });

    it('keeps the local watchlist state after a successful AUS write', async () => {
      const { controller } = buildRealController(() =>
        Promise.resolve(buildSeedPrefs()),
      );

      await controller.toggleWatchlistMarket('ETH');

      expect(controller.getWatchlistMarkets()).toContain('ETH');
    });

    it('merges with existing remote symbols — does not overwrite the whole list', async () => {
      const seedWithSol = buildSeedPrefs({
        perps: {
          inAppNotificationsEnabled: false,
          pushNotificationsEnabled: false,
          watchlistMarkets: {
            hyperliquid: { testnet: [], mainnet: ['SOL'] },
            myx: { testnet: [], mainnet: [] },
          },
        },
      });

      const { controller, putSpy } = buildRealController(() =>
        Promise.resolve(seedWithSol),
      );
      // Seed local state with SOL first
      await controller.toggleWatchlistMarket('SOL');
      putSpy.mockClear();

      await controller.toggleWatchlistMarket('BTC');

      expect(putSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          perps: expect.objectContaining({
            watchlistMarkets: expect.objectContaining({
              hyperliquid: expect.objectContaining({
                mainnet: expect.arrayContaining(['SOL', 'BTC']),
              }),
            }),
          }),
        }),
      );
    });
  });

  describe('toggleWatchlistMarket — remove', () => {
    it('calls putNotificationPreferences without the removed symbol', async () => {
      const { controller, putSpy } = buildRealController(() =>
        Promise.resolve(buildSeedPrefs()),
      );
      await controller.toggleWatchlistMarket('BTC'); // add
      putSpy.mockClear();

      await controller.toggleWatchlistMarket('BTC'); // remove

      expect(putSpy).toHaveBeenCalledTimes(1);
      const [calledPrefs] = putSpy.mock.calls[0] as [NotificationPreferences];
      expect(
        calledPrefs.perps.watchlistMarkets?.hyperliquid.mainnet,
      ).not.toContain('BTC');
    });

    it('reverts local state when the AUS write fails', async () => {
      const { controller, putSpy } = buildRealController(() =>
        Promise.resolve(buildSeedPrefs()),
      );
      await controller.toggleWatchlistMarket('BTC');
      expect(controller.getWatchlistMarkets()).toContain('BTC');

      putSpy.mockRejectedValueOnce(new Error('network error'));
      await controller.toggleWatchlistMarket('BTC'); // remove attempt fails

      expect(controller.getWatchlistMarkets()).toContain('BTC');
    });
  });

  describe('AUS write is skipped when preferences blob is not yet initialised', () => {
    it('does not call putNotificationPreferences when getNotificationPreferences returns null', async () => {
      const { controller, putSpy } = buildRealController(() =>
        Promise.resolve(null),
      );

      await controller.toggleWatchlistMarket('BTC');

      expect(putSpy).not.toHaveBeenCalled();
    });

    it('keeps the optimistic local update even when the remote write is skipped', async () => {
      const { controller } = buildRealController(() => Promise.resolve(null));

      await controller.toggleWatchlistMarket('BTC');

      expect(controller.getWatchlistMarkets()).toContain('BTC');
    });
  });
});

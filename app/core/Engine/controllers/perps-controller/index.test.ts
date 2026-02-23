import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  PerpsControllerState,
  InitializationState,
  MARKET_SORTING_CONFIG,
} from '@metamask/perps-controller';
import { perpsControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

// Mock mobile-specific modules that ./index.ts imports to avoid pulling in
// Engine and React Native dependencies in the test environment
jest.mock(
  '../../../../components/UI/Perps/adapters/mobileInfrastructure',
  () => ({
    createMobileInfrastructure: jest.fn(() => ({})),
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
    ControllerInitRequest<PerpsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);

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
      cachedMarketData: null,
      cachedMarketDataTimestamp: 0,
      cachedPositions: null,
      cachedOrders: null,
      cachedAccountState: null,
      cachedUserDataTimestamp: 0,
      cachedUserDataAddress: null,
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

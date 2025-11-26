import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  PerpsControllerState,
  InitializationState,
} from '../../../../components/UI/Perps/controllers';
import { MARKET_SORTING_CONFIG } from '../../../../components/UI/Perps/constants/perpsConfig';
import { perpsControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../components/UI/Perps/controllers', () => {
  const actualPerpsController = jest.requireActual(
    '../../../../components/UI/Perps/controllers',
  );

  return {
    controllerName: actualPerpsController.controllerName,
    getDefaultPerpsControllerState:
      actualPerpsController.getDefaultPerpsControllerState,
    InitializationState: actualPerpsController.InitializationState,
    PerpsController: jest.fn(),
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
      .requireActual('../../../../components/UI/Perps/controllers')
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
      connectionStatus: 'connected',
      positions: [
        {
          coin: 'ETH',
          size: '2.5',
          entryPrice: '3200.00',
          positionValue: '8000.00',
          unrealizedPnl: '320.00',
          marginUsed: '1600.00',
          leverage: {
            type: 'cross',
            value: 5,
          },
          liquidationPrice: '2400.00',
          maxLeverage: 100,
          returnOnEquity: '20.0',
          cumulativeFunding: {
            allTime: '-12.50',
            sinceOpen: '-8.20',
            sinceChange: '-3.10',
          },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ],
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
      marketFilterPreferences: MARKET_SORTING_CONFIG.DEFAULT_SORT_OPTION_ID,
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
      initializationState: InitializationState.UNINITIALIZED,
      initializationError: null,
      initializationAttempts: 0,
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

import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  PerpsControllerState,
} from '../../../../components/UI/Perps/controllers';
import { perpsControllerInit } from '.';

jest.mock('../../../../components/UI/Perps/controllers', () => {
  const actualPerpsController = jest.requireActual(
    '../../../../components/UI/Perps/controllers',
  );

  return {
    controllerName: actualPerpsController.controllerName,
    getDefaultPerpsControllerState:
      actualPerpsController.getDefaultPerpsControllerState,
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
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
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
        },
      ],
      accountState: null,
      perpsBalances: {},
      pendingOrders: [],
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
      withdrawInProgress: false,
      lastWithdrawResult: null,
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

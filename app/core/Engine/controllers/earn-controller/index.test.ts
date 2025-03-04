import {
  EarnController,
  EarnControllerMessenger,
  EarnControllerState,
} from '@metamask/earn-controller';
import { earnControllerInit } from '.';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { DEFAULT_VAULT_APY_AVERAGES } from '../../../../components/UI/Stake/constants';
import {
  MOCK_EXCHANGE_RATE,
  MOCK_POOLED_STAKES_DATA,
  MOCK_VAULT_DATA,
} from '../../../../components/UI/Stake/__mocks__/earnControllerMockData';

jest.mock('@metamask/earn-controller', () => {
  const actualEarnController = jest.requireActual('@metamask/earn-controller');
  return {
    controllerName: actualEarnController.controllerName,
    getDefaultEarnControllerState:
      actualEarnController.getDefaultEarnControllerState,
    EarnController: jest.fn(),
  };
});

describe('earn controller init', () => {
  const earnControllerClassMock = jest.mocked(EarnController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<EarnControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(earnControllerInit(initRequestMock).controller).toBeInstanceOf(
      EarnController,
    );
  });

  it('controller state should be default state when no initial state is passed in', () => {
    const defaultEarnControllerState = jest
      .requireActual('@metamask/earn-controller')
      .getDefaultEarnControllerState();

    earnControllerInit(initRequestMock);

    const earnControllerState = earnControllerClassMock.mock.calls[0][0].state;

    expect(earnControllerState).toEqual(defaultEarnControllerState);
  });

  it('controller state should be initial state when initial state is passed in', () => {
    const initialEarnControllerState: Partial<EarnControllerState> = {
      lastUpdated: 0,
      pooled_staking: {
        isEligible: true,
        pooledStakes: MOCK_POOLED_STAKES_DATA,
        vaultMetadata: MOCK_VAULT_DATA,
        exchangeRate: MOCK_EXCHANGE_RATE,
        vaultApyAverages: DEFAULT_VAULT_APY_AVERAGES,
        vaultDailyApys: [],
      },
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      EarnController: initialEarnControllerState,
    };

    earnControllerInit(initRequestMock);

    const earnControllerState = earnControllerClassMock.mock.calls[0][0].state;

    expect(earnControllerState).toStrictEqual(initialEarnControllerState);
  });
});

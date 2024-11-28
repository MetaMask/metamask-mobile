import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StakingBalance from './StakingBalance';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { Image } from 'react-native';
import {
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_GET_VAULT_RESPONSE,
  MOCK_STAKED_ETH_ASSET,
} from '../../__mocks__/mockData';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest.fn((_uri, success) => {
  success(100, 100); // Mock successful response for ETH native Icon Image
});

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];
const mockExchangeRate = MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate;

const mockVaultData = MOCK_GET_VAULT_RESPONSE;
// Mock hooks
jest.mock('../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    pooledStakesData: mockPooledStakeData,
    exchangeRate: mockExchangeRate,
    loading: false,
    error: null,
    refreshPooledStakes: jest.fn(),
    hasStakedPositions: true,
    hasEthToUnstake: true,
    hasNeverStaked: false,
    hasRewards: true,
    hasRewardsOnly: false,
  }),
}));

jest.mock('../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest.fn(),
  }),
}));

jest.mock('../../hooks/useVaultData', () => ({
  __esModule: true,
  default: () => ({
    vaultData: mockVaultData,
    loading: false,
    error: null,
    annualRewardRate: '2.5%',
    annualRewardRateDecimal: 0.025,
  }),
}));

jest.mock('../../hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    stakedBalanceWei: MOCK_STAKED_ETH_ASSET.balance,
    stakedBalanceFiat: MOCK_STAKED_ETH_ASSET.balanceFiat,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe('StakingBalance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_ASSET} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('redirects to StakeInputView on stake button click', () => {
    const { getByText } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_ASSET} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText(strings('stake.stake_more')));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
    });
  });

  it('redirects to UnstakeInputView on unstake button click', () => {
    const { getByText } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_ASSET} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText(strings('stake.unstake')));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
    });
  });
});

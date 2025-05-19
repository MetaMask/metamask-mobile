import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StakingBalance from './StakingBalance';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { Image } from 'react-native';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_GET_VAULT_RESPONSE,
  MOCK_STAKED_ETH_MAINNET_ASSET,
} from '../../__mocks__/stakeMockData';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../../../util/networks';
import { mockNetworkState } from '../../../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../Earn/Views/EarnInputView/EarnInputView.types';
import { selectPooledStakingEnabledFlag } from '../../../Earn/selectors/featureFlags';

type MockSelectPooledStakingEnabledFlagSelector = jest.MockedFunction<
  typeof selectPooledStakingEnabledFlag
>;

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

Image.getSize = jest
  .fn()
  .mockImplementation(
    (_uri: string, success?: (width: number, height: number) => void) => {
      if (success) {
        success(100, 100);
      }
      return Promise.resolve({ width: 100, height: 100 });
    },
  );

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];
const mockExchangeRate = MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate;

const mockVaultMetadata = MOCK_GET_VAULT_RESPONSE;
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

jest.mock('../../hooks/useVaultMetadata', () => ({
  __esModule: true,
  default: () => ({
    vaultMetadata: mockVaultMetadata,
    isLoadingVaultMetadata: false,
    error: null,
    annualRewardRate: '2.5%',
    annualRewardRateDecimal: 0.025,
  }),
}));

jest.mock('../../hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    stakedBalanceWei: MOCK_STAKED_ETH_MAINNET_ASSET.balance,
    stakedBalanceFiat: MOCK_STAKED_ETH_MAINNET_ASSET.balanceFiat,
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

jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe('StakingBalance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (
      selectPooledStakingEnabledFlag as MockSelectPooledStakingEnabledFlagSelector
    ).mockReturnValue(true);
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should match the snapshot when portfolio view is enabled  ', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    const { toJSON } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('redirects to StakeInputView on stake button click', async () => {
    const { getByText } = renderWithProvider(
      <StakingBalance asset={MOCK_ETH_MAINNET_ASSET} />,
      { state: mockInitialState },
    );

    await act(() => {
      fireEvent.press(getByText(strings('stake.stake_more')));
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: MOCK_ETH_MAINNET_ASSET,
        action: EARN_INPUT_VIEW_ACTIONS.STAKE,
      },
    });
  });

  it('redirects to UnstakeInputView on unstake button click', async () => {
    const { getByText } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      { state: mockInitialState },
    );

    await act(() => {
      fireEvent.press(getByText(strings('stake.unstake')));
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: {
        token: MOCK_STAKED_ETH_MAINNET_ASSET,
      },
    });
  });

  it('should not render if asset chainId is not a staking supporting chain', () => {
    const { queryByText, queryByTestId } = renderWithProvider(
      <StakingBalance
        asset={{ ...MOCK_STAKED_ETH_MAINNET_ASSET, chainId: '0x4' }}
      />,
      { state: mockInitialState },
    );
    expect(queryByTestId('staking-balance-container')).toBeNull();
    expect(queryByText(strings('stake.stake_more'))).toBeNull();
    expect(queryByText(strings('stake.unstake'))).toBeNull();
    expect(queryByText(`${strings('stake.claim')} ETH`)).toBeNull();
  });

  it('should not render stake cta if pooled staking is disabled', () => {
    (
      selectPooledStakingEnabledFlag as MockSelectPooledStakingEnabledFlagSelector
    ).mockReturnValue(false);

    const { getByText, getByTestId, queryByText } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      { state: mockInitialState },
    );

    expect(queryByText(strings('stake.stake_more'))).toBeNull();
    expect(queryByText(strings('stake.stake_eth_and_earn'))).toBeNull();

    expect(getByTestId('staking-balance-container')).toBeDefined();
    expect(getByText(strings('stake.unstake'))).toBeDefined();
    expect(getByText(`${strings('stake.claim')} ETH`)).toBeDefined();
  });

  it('should render claim link and action buttons if supported asset.chainId is not selected chainId', () => {
    const { queryByText, queryByTestId } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              NetworkController: {
                ...mockNetworkState({
                  chainId: CHAIN_IDS.SEPOLIA,
                  id: 'sepolia',
                  nickname: 'Sepolia',
                  ticker: 'ETH',
                }),
              },
            },
          },
        },
      },
    );

    expect(queryByTestId('staking-balance-container')).toBeTruthy();
    expect(queryByText(strings('stake.stake_more'))).toBeTruthy();
    expect(queryByText(strings('stake.unstake'))).toBeTruthy();
    expect(queryByText(`${strings('stake.claim')} ETH`)).toBeTruthy();
  });

  // We don't want to prevent users from withdrawing their ETH regardless of feature flags.
  it('should render unstake and claim buttons even if pooled-staking feature flag is disabled', () => {
    (
      selectPooledStakingEnabledFlag as MockSelectPooledStakingEnabledFlagSelector
    ).mockReturnValue(false);

    const { getByText, getByTestId, queryByText } = renderWithProvider(
      <StakingBalance asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      { state: mockInitialState },
    );

    expect(queryByText(strings('stake.stake_more'))).toBeNull();
    expect(queryByText(strings('stake.stake_eth_and_earn'))).toBeNull();

    expect(getByTestId('staking-balance-container')).toBeDefined();
    expect(getByText(strings('stake.unstake'))).toBeDefined();
    expect(getByText(`${strings('stake.claim')} ETH`)).toBeDefined();
  });
});

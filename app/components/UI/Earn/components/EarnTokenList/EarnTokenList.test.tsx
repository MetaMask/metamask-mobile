/* eslint-disable import/no-namespace */
import React from 'react';
import EarnTokenList from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
  MOCK_USDC_BASE_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
} from '../../../Stake/__mocks__/mockData';
import Engine from '../../../../../core/Engine';
import * as tokenUtils from '../../../Earn/utils/token';
import * as useStakingEligibilityHook from '../../../Stake/hooks/useStakingEligibility';
import * as portfolioNetworkUtils from '../../../../../util/networks';
import { act, fireEvent } from '@testing-library/react-native';
import { mockedEarnFeatureFlagState } from '../../__mocks__/mockData';

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
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/networks', () => ({
  isPortfolioViewEnabled: jest.fn().mockReturnValue(true),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn().mockReturnValue(10),
}));

const initialState = {
  ...initialRootState,
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          ...mockedEarnFeatureFlagState,
        },
      },
    },
  },
};

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let useStakingEligibilitySpy: jest.SpyInstance;
let getSupportedEarnTokensSpy: jest.SpyInstance;
let filterEligibleTokensSpy: jest.SpyInstance;

describe('EarnTokenList', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useStakingEligibilitySpy = jest
      .spyOn(useStakingEligibilityHook, 'default')
      .mockReturnValue({
        isEligible: true,
        isLoadingEligibility: false,
        refreshPooledStakingEligibility: jest.fn().mockResolvedValue({
          isEligible: true,
        }),
        error: '',
      });

    getSupportedEarnTokensSpy = jest
      .spyOn(tokenUtils, 'getSupportedEarnTokens')
      .mockReturnValue(MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE);

    filterEligibleTokensSpy = jest.spyOn(tokenUtils, 'filterEligibleTokens');
  });

  it('render matches snapshot', () => {
    const { toJSON, getByText, getAllByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: initialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();

    // Bottom Sheet Title
    expect(getByText(strings('stake.select_a_token'))).toBeDefined();

    // Upsell Banner
    expect(getByText(strings('stake.you_could_earn'))).toBeDefined();
    expect(getByText(strings('stake.per_year_on_your_tokens'))).toBeDefined();

    // Token List
    // Ethereum
    expect(getAllByText('Ethereum').length).toBe(1);
    expect(getAllByText('2.3% APR').length).toBe(1);

    // DAI
    expect(getByText('Dai Stablecoin')).toBeDefined();
    expect(getByText('5.0% APR')).toBeDefined();

    // USDT
    expect(getByText('Tether USD')).toBeDefined();
    expect(getByText('4.1% APR')).toBeDefined();

    // USDC
    expect(getByText('USDC')).toBeDefined();
    expect(getAllByText('4.5% APR').length).toBe(1);

    expect(getSupportedEarnTokensSpy).toHaveBeenCalled();
    expect(filterEligibleTokensSpy).toHaveBeenCalled();
  });

  it('does not render the EarnTokenList when required feature flags are disabled', () => {
    // Requires stablecoin lending an portfolio view to be enabled.
    const stateWithStablecoinLendingDisabled = {
      ...initialRootState,
      engine: {
        ...initialRootState.engine,
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              earnStablecoinLendingEnabled: false,
            },
          },
        },
      },
    };

    jest
      .spyOn(portfolioNetworkUtils, 'isPortfolioViewEnabled')
      .mockReturnValueOnce(false);

    const { toJSON } = renderWithProvider(<EarnTokenList />, {
      state: stateWithStablecoinLendingDisabled,
    });

    expect(toJSON()).toBeNull();
  });

  it('filters out pooled-staking assets when pooled staking is disabled', () => {
    const stateWithPooledStakingDisabled = {
      ...initialRootState,
      engine: {
        ...initialRootState.engine,
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              ...mockedEarnFeatureFlagState,
              earnPooledStakingEnabled: false,
            },
          },
        },
      },
    };

    const { queryAllByText, getByText, getAllByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: stateWithPooledStakingDisabled,
      },
    );

    // Bottom Sheet Title
    expect(getByText(strings('stake.select_a_token'))).toBeDefined();

    // Upsell Banner
    expect(getByText(strings('stake.you_could_earn'))).toBeDefined();
    expect(getByText(strings('stake.per_year_on_your_tokens'))).toBeDefined();

    // Token List
    // Ethereum should be filtered out
    expect(queryAllByText('Ethereum').length).toBe(0);
    expect(queryAllByText('2.3% APR').length).toBe(0);

    // DAI
    expect(getByText('Dai Stablecoin')).toBeDefined();
    expect(getByText('5.0% APR')).toBeDefined();

    // USDT
    expect(getByText('Tether USD')).toBeDefined();
    expect(getByText('4.1% APR')).toBeDefined();

    // USDC
    expect(getByText('USDC')).toBeDefined();
    expect(getAllByText('4.5% APR').length).toBe(1);

    expect(getSupportedEarnTokensSpy).toHaveBeenCalled();
    expect(filterEligibleTokensSpy).toHaveBeenCalled();
  });

  it('changes active network if selected token is on a different network', async () => {
    getSupportedEarnTokensSpy = jest
      .spyOn(tokenUtils, 'getSupportedEarnTokens')
      .mockReturnValue([MOCK_USDC_BASE_MAINNET_ASSET]);

    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: initialState,
      },
    );

    const baseUsdc = getByText('USDC');

    await act(() => {
      fireEvent.press(baseUsdc);
    });

    expect(
      Engine.context.NetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('mainnet');

    expect(getSupportedEarnTokensSpy).toHaveBeenCalled();
    expect(filterEligibleTokensSpy).toHaveBeenCalled();
  });

  it('hides staking tokens if user is not eligible', () => {
    useStakingEligibilitySpy.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest.fn().mockResolvedValue({
        isEligible: false,
      }),
      error: '',
    });

    const { queryByText, getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: initialState,
      },
    );

    expect(queryByText('Ethereum')).toBeNull();
    expect(queryByText('Staked Ethereum')).toBeNull();

    expect(getByText('Dai Stablecoin')).toBeDefined();
    expect(getByText('USDC')).toBeDefined();
    expect(getByText('Tether USD')).toBeDefined();

    expect(getSupportedEarnTokensSpy).toHaveBeenCalled();

    expect(filterEligibleTokensSpy).toHaveBeenCalledWith(
      MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
      { canStake: false, canLend: true },
    );
  });

  it('hides lending tokens if user is not eligible', () => {
    filterEligibleTokensSpy.mockImplementationOnce(() =>
      tokenUtils.filterEligibleTokens(
        MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
        { canStake: true, canLend: false },
      ),
    );

    const { queryByText, getAllByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: initialState,
      },
    );

    expect(getAllByText('Ethereum').length).toBe(1);
    expect(queryByText('Staked Ethereum')).toBeDefined();

    expect(queryByText('Dai Stablecoin')).toBeNull();
    expect(queryByText('USDC')).toBeNull();
    expect(queryByText('Tether USD')).toBeNull();
    expect(queryByText('USD Coin')).toBeNull();

    expect(getSupportedEarnTokensSpy).toHaveBeenCalled();
    expect(filterEligibleTokensSpy).toHaveBeenCalled();
  });

  it('redirects to StakeInputView with pooled staking navigation params for staking token', async () => {
    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: initialState,
      },
    );

    const ethButton = getByText('Ethereum');

    await act(() => {
      fireEvent.press(ethButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        action: 'STAKE',
        token: {
          address: MOCK_ETH_MAINNET_ASSET.address,
          aggregators: [],
          balance: '',
          balanceFiat: '',
          chainId: '0x1',
          decimals: 18,
          image: '',
          isETH: true,
          isNative: true,
          isStaked: false,
          logo: '',
          name: 'Ethereum',
          symbol: 'Ethereum',
          ticker: 'ETH',
          balanceFormatted: ' ETH',
          balanceFiatNumber: 0,
          balanceMinimalUnit: '0',
          apr: '2.3',
          estimatedAnnualRewardsFormatted: '',
        },
      },
      screen: 'Stake',
    });
  });

  it('redirect to StakeInputView with stablecoin lending navigation params for lending token', async () => {
    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: initialState,
      },
    );

    const usdcButton = getByText('USDC');

    await act(() => {
      fireEvent.press(usdcButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        action: 'LEND',
        token: {
          address: MOCK_USDC_MAINNET_ASSET.address,
          aggregators: [],
          balance: '',
          balanceFiat: 'tokenBalanceLoading',
          chainId: '0x1',
          decimals: 6,
          image: '',
          isETH: false,
          isNative: false,
          isStaked: false,
          logo: '',
          name: 'USDC',
          symbol: 'USDC',
          ticker: 'USDC',
          balanceFormatted: 'tokenBalanceLoading',
          balanceFiatNumber: 0,
          balanceMinimalUnit: '0',
          apr: '4.5',
          estimatedAnnualRewardsFormatted: '',
        },
      },
      screen: 'Stake',
    });
  });
});

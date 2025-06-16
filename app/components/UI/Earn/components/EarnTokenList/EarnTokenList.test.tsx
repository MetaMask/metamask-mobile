/* eslint-disable import/no-namespace */
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import * as ReactNative from 'react-native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import EarnTokenList from '.';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import * as portfolioNetworkUtils from '../../../../../util/networks';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_USDC_BASE_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
} from '../../../Stake/__mocks__/stakeMockData';
import * as useStakingEligibilityHook from '../../../Stake/hooks/useStakingEligibility';
import { getMockUseEarnTokens } from '../../__mocks__/earnMockData';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import * as useEarnTokensHook from '../../hooks/useEarnTokens';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../selectors/featureFlags';
import { EarnTokenDetails } from '../../types/lending.types';

jest.mock('../../selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn().mockImplementation(() => true),
  selectStablecoinLendingEnabledFlag: jest.fn().mockImplementation(() => true),
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
    useRoute: () => ({
      params: {
        tokenFilter: {
          includeReceiptTokens: false,
        },
        onItemPressScreen: 'DEPOSIT',
      },
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
    },
  },
};

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let useEarnTokensSpy: jest.SpyInstance;

const mockEarnTokens: EarnTokenDetails[] = [
  Object.values(getMockUseEarnTokens(EARN_EXPERIENCES.POOLED_STAKING))[0],
  Object.values(getMockUseEarnTokens(EARN_EXPERIENCES.STABLECOIN_LENDING))[0],
];

const mockEarnOutputTokens: EarnTokenDetails[] = [
  Object.values(getMockUseEarnTokens(EARN_EXPERIENCES.POOLED_STAKING))[1],
  Object.values(getMockUseEarnTokens(EARN_EXPERIENCES.STABLECOIN_LENDING))[1],
];

describe('EarnTokenList', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(useStakingEligibilityHook, 'default').mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest.fn().mockResolvedValue({
        isEligible: true,
      }),
      error: '',
    });

    useEarnTokensSpy = jest
      .spyOn(useEarnTokensHook, 'default')
      .mockReturnValue({
        earnTokens: mockEarnTokens,
        earnOutputTokens: mockEarnOutputTokens,
        earnableTotalFiatFormatted: '$100.00',
        earnableTotalFiatNumber: 100,
        earnTokensByChainIdAndAddress: {},
        earnOutputTokensByChainIdAndAddress: {},
        earnTokenPairsByChainIdAndAddress: {},
        earnOutputTokenPairsByChainIdAndAddress: {},
        getEarnToken: jest.fn(),
        getOutputToken: jest.fn(),
        getPairedEarnTokens: jest.fn(),
        getEarnExperience: jest.fn(),
        getEstimatedAnnualRewardsForAmount: jest.fn(),
      });

    (
      selectStablecoinLendingEnabledFlag as unknown as jest.Mock
    ).mockReturnValue(true);
    (selectPooledStakingEnabledFlag as unknown as jest.Mock).mockReturnValue(
      true,
    );

    jest
      .spyOn(ReactNative.Image, 'getSize')
      .mockImplementation((_uri, success) => {
        success(100, 100);
      });
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
    expect(getByText(strings('stake.you_could_earn_up_to'))).toBeDefined();
    expect(getByText(strings('stake.per_year_on_your_tokens'))).toBeDefined();

    // Token List
    // Ethereum
    expect(getAllByText('Ethereum').length).toBe(1);
    expect(getAllByText('2.3% APR').length).toBe(1);

    // USDC
    expect(getByText('USDC')).toBeDefined();
    expect(getByText('4.0% APR')).toBeDefined();

    expect(useEarnTokensSpy).toHaveBeenCalled();
  });

  it('does not render the EarnTokenList when required feature flags are disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as unknown as jest.Mock
    ).mockReturnValue(false);

    jest
      .spyOn(portfolioNetworkUtils, 'isPortfolioViewEnabled')
      .mockReturnValueOnce(false);

    const { toJSON } = renderWithProvider(<EarnTokenList />, {
      state: initialState,
    });

    expect(toJSON()).toBeNull();
  });

  it('changes active network if selected token is on a different network', async () => {
    useEarnTokensSpy.mockReturnValue({
      earnTokens: [
        {
          ...MOCK_USDC_BASE_MAINNET_ASSET,
          balanceFormatted: '1 USDC',
          balanceMinimalUnit: '1000000',
          balanceFiatNumber: 1,
          tokenUsdExchangeRate: 1,
          experience: {
            apr: '4.5',
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            estimatedAnnualRewardsFormatted: '',
            estimatedAnnualRewardsFiatNumber: 0,
            estimatedAnnualRewardsTokenMinimalUnit: '0',
            estimatedAnnualRewardsTokenFormatted: '',
          },
          experiences: [
            {
              apr: '4.5',
              type: EARN_EXPERIENCES.STABLECOIN_LENDING,
              estimatedAnnualRewardsFormatted: '',
              estimatedAnnualRewardsFiatNumber: 0,
              estimatedAnnualRewardsTokenMinimalUnit: '0',
              estimatedAnnualRewardsTokenFormatted: '',
            },
          ],
        },
      ],
      earnOutputTokens: [],
      earnableTotalFiatFormatted: '$100.00',
      earnableTotalFiatNumber: 100,
      earnTokensByChainIdAndAddress: {},
      earnOutputTokensByChainIdAndAddress: {},
      earnTokenPairsByChainIdAndAddress: {},
      earnOutputTokenPairsByChainIdAndAddress: {},
      getEarnToken: jest.fn(),
      getOutputToken: jest.fn(),
      getPairedEarnTokens: jest.fn(),
      getEarnExperience: jest.fn(),
      getEstimatedAnnualRewardsForAmount: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      {
        state: initialState,
      },
    );

    const baseUsdc = getByText('USDC');

    await act(async () => {
      fireEvent.press(baseUsdc);
    });

    expect(
      Engine.context.NetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('mainnet');

    expect(useEarnTokensSpy).toHaveBeenCalled();
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

    await act(async () => {
      fireEvent.press(ethButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        token: expect.objectContaining({
          address: '0x0000000000000000000000000000000000000000',
          balance: '0.30235',
          balanceFiat: '$802.68',
          chainId: '0x1',
          decimals: 18,
          isETH: true,
          isNative: true,
          isStaked: false,
          logo: '../images/eth-logo-new.png',
          name: 'Ethereum',
          symbol: 'Ethereum',
          ticker: 'ETH',
          balanceFormatted: '0.30235 ETH',
          balanceFiatNumber: 802.68,
          balanceMinimalUnit: '302345206021065265',
          tokenUsdExchangeRate: 2654.006436723641,
          experience: expect.objectContaining({
            type: 'POOLED_STAKING',
            apr: '2.3',
            estimatedAnnualRewardsFormatted: '$19.00',
            estimatedAnnualRewardsFiatNumber: 18.46164,
          }),
        }),
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

    await act(async () => {
      fireEvent.press(usdcButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        token: expect.objectContaining({
          address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
          balanceFiat: '$103.69',
          balanceFiatNumber: 103.68688,
          balanceFormatted: '103.78605 USDC',
          balanceMinimalUnit: '103786045',
          chainId: '0x1',
          decimals: 6,
          isETH: false,
          isNative: false,
          isStaked: false,
          name: 'USDC',
          symbol: 'USDC',
          token: 'USDC',
          tokenUsdExchangeRate: 0.9990444771786842,
          experience: expect.objectContaining({
            type: 'STABLECOIN_LENDING',
            apr: '4.0',
            estimatedAnnualRewardsFormatted: '$5.00',
            estimatedAnnualRewardsFiatNumber: 4.147826431784605,
          }),
        }),
      },
      screen: 'Stake',
    });
  });

  it('displays loading state when tokens are being fetched', () => {
    useEarnTokensSpy.mockReturnValue({
      earnTokens: [],
      earnOutputTokens: [],
      earnableTotalFiatFormatted: '$0.00',
      earnableTotalFiatNumber: 0,
      earnTokensByChainIdAndAddress: {},
      earnOutputTokensByChainIdAndAddress: {},
      earnTokenPairsByChainIdAndAddress: {},
      earnOutputTokenPairsByChainIdAndAddress: {},
      getEarnToken: jest.fn(),
      getOutputToken: jest.fn(),
      getPairedEarnTokens: jest.fn(),
      getEarnExperience: jest.fn(),
      getEstimatedAnnualRewardsForAmount: jest.fn(),
      isLoading: true,
    });

    const { getByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      { state: initialState },
    );

    expect(getByTestId('earn-token-list-skeleton')).toBeTruthy();
  });

  it('sorts tokens by balance (non-zero first)', () => {
    const { getAllByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      { state: initialState },
    );

    const tokenItems = getAllByTestId('earn-token-list-item');
    const firstToken = tokenItems[0];
    const secondToken = tokenItems[1];

    expect(firstToken).toHaveTextContent(/Ethereum/);
    expect(secondToken).toHaveTextContent(/USDC/);
  });

  it('handles token press for different token types', async () => {
    const mockTokens = [
      {
        ...MOCK_ETH_MAINNET_ASSET,
        balanceFormatted: '1.5 ETH',
        balanceMinimalUnit: '1500000000000000000', // wei
        experience: { apr: '5.2', type: EARN_EXPERIENCES.POOLED_STAKING },
        experiences: [{ apr: '5.2', type: EARN_EXPERIENCES.POOLED_STAKING }],
      },
      {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '100.0 USDC',
        balanceMinimalUnit: '100000000',
        experience: { apr: '3.5', type: EARN_EXPERIENCES.STABLECOIN_LENDING },
        experiences: [
          { apr: '3.5', type: EARN_EXPERIENCES.STABLECOIN_LENDING },
        ],
      },
    ];

    useEarnTokensSpy.mockReturnValue({
      earnTokens: mockTokens,
      earnOutputTokens: [],
      earnableTotalFiatFormatted: '$100.00',
      earnableTotalFiatNumber: 100,
      earnTokensByChainIdAndAddress: {},
      earnOutputTokensByChainIdAndAddress: {},
      earnTokenPairsByChainIdAndAddress: {},
      earnOutputTokenPairsByChainIdAndAddress: {},
      getEarnToken: jest.fn(),
      getOutputToken: jest.fn(),
      getPairedEarnTokens: jest.fn(),
      getEarnExperience: jest.fn(),
      getEstimatedAnnualRewardsForAmount: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EarnTokenList />
      </SafeAreaProvider>,
      { state: initialState },
    );

    await act(async () => {
      fireEvent.press(getByText('Ethereum'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'StakeScreens',
      expect.anything(),
    );

    await act(async () => {
      fireEvent.press(getByText('USDC'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'StakeScreens',
      expect.anything(),
    );
  });
});

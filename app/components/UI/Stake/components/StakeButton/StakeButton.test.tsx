import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import StakeButton from './index';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
} from '../../__mocks__/stakeMockData';
import { useMetrics } from '../../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { mockNetworkState } from '../../../../../util/test/network';
import AppConstants from '../../../../../core/AppConstants';
import useStakingEligibility from '../../hooks/useStakingEligibility';
import { RootState } from '../../../../../reducers';
import { SolScope, TrxScope } from '@metamask/keyring-api';
import Engine from '../../../../../core/Engine';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectMusdConversionPaymentTokensAllowlist,
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { TokenI } from '../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { Alert } from 'react-native';
import { Hex } from '@metamask/utils';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';

const mockNavigate = jest.fn();

const MOCK_APR_VALUES: { [symbol: string]: string } = {
  Ethereum: '2.3',
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
};

const mockGetEarnToken = jest.fn((token: TokenI) => {
  const experienceType =
    token.symbol === 'USDC'
      ? EARN_EXPERIENCES.STABLECOIN_LENDING
      : EARN_EXPERIENCES.POOLED_STAKING;

  const experiences = [
    {
      type: experienceType as EARN_EXPERIENCES,
      apr: MOCK_APR_VALUES?.[token.symbol] ?? '',
      estimatedAnnualRewardsFormatted: '',
      estimatedAnnualRewardsFiatNumber: 0,
    },
  ];

  const baseEarnToken = {
    ...token,
    balanceFormatted: token.symbol === 'USDC' ? '6.84314 USDC' : '0',
    balanceFiat: token.symbol === 'USDC' ? '$6.84' : '$0.00',
    balanceMinimalUnit: token.symbol === 'USDC' ? '6.84314' : '0',
    balanceFiatNumber: token.symbol === 'USDC' ? 6.84314 : 0,
  };

  const adjustedEarnToken =
    token.symbol === 'TRX'
      ? {
          ...baseEarnToken,
          balanceMinimalUnit: '1',
        }
      : baseEarnToken;

  return {
    ...adjustedEarnToken,
    experiences,
    tokenUsdExchangeRate: 0,
    experience: experiences[0],
  };
});

jest.mock('../../../Earn/hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({
    getEarnToken: (token: TokenI) => mockGetEarnToken(token),
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../hooks/useMetrics');

jest.mock('../../../../hooks/useBuildPortfolioUrl', () => ({
  useBuildPortfolioUrl: jest.fn(() => (baseUrl: string) => {
    const url = new URL(baseUrl);
    url.searchParams.set('metamaskEntry', 'mobile');
    url.searchParams.set('marketingEnabled', 'true');
    url.searchParams.set('metricsEnabled', 'true');
    return url;
  }),
}));

// Mock the environment variables
jest.mock('../../../../../util/environment', () => ({
  isProduction: jest.fn().mockReturnValue(false),
}));

// Mock the feature flags selector
jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn().mockReturnValue(true),
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(true),
  selectIsMusdConversionFlowEnabledFlag: jest.fn().mockReturnValue(false),
  selectMusdConversionPaymentTokensAllowlist: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: jest.fn(() => ({
    initiateConversion: jest.fn(),
    error: null,
  })),
}));

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: jest.fn(),
}));

const mockUseMusdConversionTokens =
  useMusdConversionTokens as jest.MockedFunction<
    typeof useMusdConversionTokens
  >;
mockUseMusdConversionTokens.mockReturnValue({
  isConversionToken: jest.fn().mockReturnValue(false),
  tokenFilter: jest.fn(),
  isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
  tokens: [],
});

jest.mock('../../../../../selectors/earnController/earn', () => ({
  earnSelectors: {
    selectPrimaryEarnExperienceTypeForAsset: jest.fn((_state, asset) =>
      asset.symbol === 'USDC' ? 'STABLECOIN_LENDING' : 'POOLED_STAKING',
    ),
  },
}));

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: jest.fn(),
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(() => Promise.resolve()),
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
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: jest.fn().mockReturnValue(true),
  }),
);

const mockIsTronChainId = jest.fn().mockReturnValue(false);

jest.mock('../../../../../core/Multichain/utils', () => {
  const actual = jest.requireActual('../../../../../core/Multichain/utils');
  return {
    ...actual,
    isTronChainId: (...args: unknown[]) =>
      mockIsTronChainId(...(args as [string])),
  };
});

jest.mock('../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isEligible: true,
    isLoadingEligibility: false,
    refreshPooledStakingEligibility: jest.fn().mockResolvedValue({
      isEligible: true,
    }),
    error: false,
  })),
}));

// Update the top-level mock to use a mockImplementation that we can change
jest.mock('../../hooks/useStakingChain', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isStakingSupportedChain: true,
  })),
}));

// Import the mock function to control it in tests
const useStakingChain = jest.requireMock('../../hooks/useStakingChain').default;

const STATE_MOCK = {
  engine: {
    backgroundState: {
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
        }),
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,

        multichainNetworkConfigurationsByChainId: {
          'bip122:000000000019d6689c085ae165831e93': {
            chainId: 'bip122:000000000019d6689c085ae165831e93',
            name: 'Bitcoin Mainnet',
            nativeCurrency: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
            isEvm: false,
          },
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            name: 'Solana Mainnet',
            nativeCurrency:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            isEvm: false,
          },
        },
      },
    },
  },
} as unknown as RootState;

const renderComponent = (state = STATE_MOCK) =>
  renderWithProvider(<StakeButton asset={MOCK_ETH_MAINNET_ASSET} />, {
    state,
  });

const selectPrimaryEarnExperienceTypeForAssetMock = jest.requireMock(
  '../../../../../selectors/earnController/earn',
).earnSelectors.selectPrimaryEarnExperienceTypeForAsset as jest.Mock;

describe('StakeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeDefined();
  });

  describe('Pooled-Staking', () => {
    it('navigates to Web view when earn button is pressed and user is not eligible', async () => {
      (useStakingEligibility as jest.Mock).mockReturnValue({
        isEligible: false,
        isLoadingEligibility: false,
        refreshPooledStakingEligibility: jest
          .fn()
          .mockResolvedValue({ isEligible: false }),
        error: false,
      });
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
          params: {
            newTabUrl: `${AppConstants.STAKE.URL}?metamaskEntry=mobile&marketingEnabled=true&metricsEnabled=true`,
            timestamp: expect.any(Number),
          },
          screen: Routes.BROWSER.VIEW,
        });
      });
    });

    it('navigates to Stake Input screen when stake button is pressed and user is eligible', async () => {
      (useStakingEligibility as jest.Mock).mockReturnValue({
        isEligible: true,
        isLoadingEligibility: false,
        refreshPooledStakingEligibility: jest
          .fn()
          .mockResolvedValue({ isEligible: true }),
        error: false,
      });
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
          screen: Routes.STAKING.STAKE,
          params: {
            token: MOCK_ETH_MAINNET_ASSET,
          },
        });
      });
    });

    it('navigates to Stake Input screen when on unsupported network', async () => {
      // Update the mock for this specific test
      useStakingChain.mockImplementation(() => ({
        isStakingSupportedChain: false,
      }));

      const UNSUPPORTED_NETWORK_STATE = {
        engine: {
          backgroundState: {
            NetworkController: {
              ...mockNetworkState({
                chainId: '0x89', // Polygon
              }),
            },
            MultichainNetworkController: {
              isEvmSelected: true,
              selectedMultichainNetworkChainId: SolScope.Mainnet,

              multichainNetworkConfigurationsByChainId: {
                'bip122:000000000019d6689c085ae165831e93': {
                  chainId: 'bip122:000000000019d6689c085ae165831e93',
                  name: 'Bitcoin Mainnet',
                  nativeCurrency:
                    'bip122:000000000019d6689c085ae165831e93/slip44:0',
                  isEvm: false,
                },
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
                  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                  name: 'Solana Mainnet',
                  nativeCurrency:
                    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  isEvm: false,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const spySetActiveNetwork = jest.spyOn(
        Engine.context.MultichainNetworkController,
        'setActiveNetwork',
      );
      const { getByTestId } = renderComponent(UNSUPPORTED_NETWORK_STATE);
      fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
      await waitFor(() => {
        expect(spySetActiveNetwork).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
          screen: Routes.STAKING.STAKE,
          params: {
            token: { ...MOCK_ETH_MAINNET_ASSET },
          },
        });
      });
    });
  });

  describe('Stablecoin Lending', () => {
    it('navigates to Lending Input View when earn button is pressed', async () => {
      const { getByTestId } = renderWithProvider(
        <StakeButton asset={MOCK_USDC_MAINNET_ASSET} />,
        {
          state: STATE_MOCK,
        },
      );

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
          screen: Routes.STAKING.STAKE,
          params: {
            token: MOCK_USDC_MAINNET_ASSET,
          },
        });
      });
    });
  });

  describe('Tron staking', () => {
    const MOCK_TRX_ASSET: TokenI = {
      ...MOCK_ETH_MAINNET_ASSET,
      symbol: 'TRX',
      name: 'Tron',
      chainId: TrxScope.Mainnet as unknown as string,
      isNative: true,
      // Ensure ETH-specific logic does not apply
      isETH: false,
    };

    it('navigates to Stake Input screen when TRX has POOLED_STAKING experience', async () => {
      mockIsTronChainId.mockReturnValue(true);
      selectPrimaryEarnExperienceTypeForAssetMock.mockReturnValueOnce(
        EARN_EXPERIENCES.POOLED_STAKING,
      );

      const { getByTestId } = renderWithProvider(
        <StakeButton asset={MOCK_TRX_ASSET} />,
        {
          state: STATE_MOCK,
        },
      );

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
          screen: Routes.STAKING.STAKE,
          params: {
            token: MOCK_TRX_ASSET,
          },
        });
      });
    });
  });

  it('does not render button when all earn experiences are disabled', () => {
    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(false);
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    const { queryByTestId } = renderComponent();

    expect(queryByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeNull();
  });

  it('does not render button when all pooled staking experience is disabled and token is ETH', () => {
    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(false);
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    const { queryByTestId } = renderComponent();

    expect(queryByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeNull();
  });

  describe('mUSD Conversion', () => {
    const mockInitiateConversion = jest.fn();

    const useMusdConversionMock = jest.mocked(useMusdConversion);
    const selectIsMusdConversionFlowEnabledFlagMock = jest.mocked(
      selectIsMusdConversionFlowEnabledFlag,
    );
    const selectMusdConversionPaymentTokensAllowlistMock = jest.mocked(
      selectMusdConversionPaymentTokensAllowlist,
    );

    beforeEach(() => {
      jest.clearAllMocks();
      mockInitiateConversion.mockResolvedValue('tx-123');
      useMusdConversionMock.mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: true,
      });
      mockUseMusdConversionTokens.mockReturnValue({
        isConversionToken: jest.fn().mockReturnValue(false),
        tokenFilter: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        tokens: [],
      });
    });

    it('renders Convert CTA for convertible stablecoin when flag enabled', () => {
      selectIsMusdConversionFlowEnabledFlagMock.mockReturnValue(true);
      selectMusdConversionPaymentTokensAllowlistMock.mockReturnValue({
        '0x1': [MOCK_USDC_MAINNET_ASSET.address as Hex],
      });

      mockUseMusdConversionTokens.mockReturnValue({
        isConversionToken: jest.fn(
          (asset) =>
            asset?.address?.toLowerCase() ===
              MOCK_USDC_MAINNET_ASSET.address.toLowerCase() &&
            asset?.chainId === MOCK_USDC_MAINNET_ASSET.chainId,
        ),
        tokenFilter: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        tokens: [],
      });

      const { getByText } = renderWithProvider(
        <StakeButton asset={MOCK_USDC_MAINNET_ASSET} />,
        {
          state: STATE_MOCK,
        },
      );

      expect(getByText('Convert to mUSD')).toBeDefined();
    });

    it('calls initiateConversion with correct parameters when Convert button pressed', async () => {
      selectIsMusdConversionFlowEnabledFlagMock.mockReturnValue(true);
      const mockAllowlist = {
        '0x1': [MOCK_USDC_MAINNET_ASSET.address as Hex],
      } as Record<Hex, Hex[]>;

      selectMusdConversionPaymentTokensAllowlistMock.mockReturnValue(
        mockAllowlist,
      );

      mockUseMusdConversionTokens.mockReturnValue({
        isConversionToken: jest.fn(
          (asset) =>
            asset?.address?.toLowerCase() ===
              MOCK_USDC_MAINNET_ASSET.address.toLowerCase() &&
            asset?.chainId === MOCK_USDC_MAINNET_ASSET.chainId,
        ),
        tokenFilter: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        tokens: [],
      });

      const { getByTestId } = renderWithProvider(
        <StakeButton asset={MOCK_USDC_MAINNET_ASSET} />,
        {
          state: STATE_MOCK,
        },
      );

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: '0x1',
          preferredPaymentToken: {
            address: '0xaBc',
            chainId: '0x1',
          },
          navigationStack: Routes.EARN.ROOT,
        });
      });
    });

    it('shows Alert when conversion fails', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const conversionError = new Error('Conversion failed');
      mockInitiateConversion.mockRejectedValue(conversionError);

      selectIsMusdConversionFlowEnabledFlagMock.mockReturnValue(true);
      selectMusdConversionPaymentTokensAllowlistMock.mockReturnValue({
        '0x1': [MOCK_USDC_MAINNET_ASSET.address as Hex],
      });

      mockUseMusdConversionTokens.mockReturnValue({
        isConversionToken: jest.fn(
          (asset) =>
            asset?.address?.toLowerCase() ===
              MOCK_USDC_MAINNET_ASSET.address.toLowerCase() &&
            asset?.chainId === MOCK_USDC_MAINNET_ASSET.chainId,
        ),
        tokenFilter: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        tokens: [],
      });

      const { getByTestId } = renderWithProvider(
        <StakeButton asset={MOCK_USDC_MAINNET_ASSET} />,
        {
          state: STATE_MOCK,
        },
      );

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Conversion Failed',
          expect.stringContaining('Conversion failed'),
          expect.any(Array),
        );
      });

      mockAlert.mockRestore();
    });

    it('renders button for convertible stablecoin even with zero balance', () => {
      selectIsMusdConversionFlowEnabledFlagMock.mockReturnValue(true);
      selectMusdConversionPaymentTokensAllowlistMock.mockReturnValue({
        '0x1': [MOCK_USDC_MAINNET_ASSET.address as Hex],
      });

      mockUseMusdConversionTokens.mockReturnValue({
        isConversionToken: jest.fn(
          (asset) =>
            asset?.address?.toLowerCase() ===
              MOCK_USDC_MAINNET_ASSET.address.toLowerCase() &&
            asset?.chainId === MOCK_USDC_MAINNET_ASSET.chainId,
        ),
        tokenFilter: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        tokens: [],
      });

      const zeroBalanceAsset = {
        ...MOCK_USDC_MAINNET_ASSET,
        balance: '0',
      };

      const { getByTestId } = renderWithProvider(
        <StakeButton asset={zeroBalanceAsset} />,
        {
          state: STATE_MOCK,
        },
      );

      expect(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeDefined();
    });

    it('does not render Convert CTA when flag disabled', () => {
      selectIsMusdConversionFlowEnabledFlagMock.mockReturnValue(false);

      const { queryByText } = renderWithProvider(
        <StakeButton asset={MOCK_USDC_MAINNET_ASSET} />,
        {
          state: STATE_MOCK,
        },
      );

      expect(queryByText('Convert')).toBeNull();
    });

    it('does not render Convert CTA for non-convertible tokens', () => {
      selectIsMusdConversionFlowEnabledFlagMock.mockReturnValue(true);
      // Allowlist doesn't include ETH address, so ETH won't show Convert CTA
      selectMusdConversionPaymentTokensAllowlistMock.mockReturnValue({
        '0x1': [MOCK_USDC_MAINNET_ASSET.address as Hex],
      });

      const { queryByText } = renderComponent();

      expect(queryByText('Convert')).toBeNull();
    });
  });
});

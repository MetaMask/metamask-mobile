import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import BN4 from 'bnjs4';
import React from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import useMetrics from '../../../../hooks/useMetrics/useMetrics';
import {
  ConfirmationRedesignRemoteFlags,
  selectConfirmationRedesignFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { flushPromises } from '../../../../../util/test/utils';
import { getStakingNavbar } from '../../../Navbar';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_GET_VAULT_RESPONSE,
  MOCK_STAKED_ETH_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
} from '../../../Stake/__mocks__/stakeMockData';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { EarnTokenDetails, LendingProtocol } from '../../types/lending.types';
import { getAaveV3MaxRiskAwareWithdrawalAmount } from '../../utils/tempLending';
import EarnWithdrawInputView from './EarnWithdrawInputView';
import { EarnWithdrawInputViewProps } from './EarnWithdrawInputView.types';

jest.mock('../../../Navbar', () => ({
  getStakingNavbar: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../../selectors/multichain', () => ({
  selectAccountTokensAcrossChains: jest.fn(() => ({
    '0x1': [
      {
        address: '0x0',
        symbol: 'ETH',
        decimals: 18,
        balance: '1.5',
        balanceFiat: '$3000',
        isNative: true,
        isETH: true,
      },
    ],
  })),
}));

const mockBalanceBN = new BN4('1000000000000000000');

const baseProps: EarnWithdrawInputViewProps = {
  route: {
    params: {
      token: MOCK_ETH_MAINNET_ASSET,
    },
    key: Routes.STAKING.UNSTAKE,
    name: 'params',
  },
};

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.STAKING.UNSTAKE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
    baseProps.route.params,
  );
}

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      reset: mockReset,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

jest.mock('../../../../../selectors/currencyRateController.ts', () => ({
  selectConversionRate: jest.fn(() => 2000),
  selectCurrentCurrency: jest.fn(() => 'USD'),
  selectCurrencyRates: jest.fn(() => ({
    ETH: 2000,
  })),
}));

const mockVaultMetadata = MOCK_GET_VAULT_RESPONSE;
const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];

jest.mock('../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest.fn(),
  }),
}));

jest.mock('../../../Stake/hooks/useVaultMetadata', () => ({
  __esModule: true,
  default: () => ({
    vaultMetadata: mockVaultMetadata,
    isLoadingVaultMetadata: false,
    error: null,
    annualRewardRate: '2.5%',
    annualRewardRateDecimal: 0.025,
  }),
}));

jest.mock('../../../Stake/hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    balanceWei: mockBalanceBN,
    stakedBalanceWei: mockPooledStakeData.assets,
    stakedBalanceFiat: MOCK_STAKED_ETH_MAINNET_ASSET.balanceFiat,
    formattedStakedBalanceETH: '5.79133 ETH',
  }),
}));

jest.mock('../../../Stake/hooks/usePoolStakedUnstake', () => ({
  __esModule: true,
  default: () => ({
    attemptUnstakeTransaction: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../../../selectors/featureFlagController/confirmations');

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(false),
  selectPooledStakingEnabledFlag: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../hooks/useMetrics/useMetrics');

jest.mock('../../hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({
    getEarnToken: jest.fn().mockImplementation((token) => {
      if (token.address === MOCK_ETH_MAINNET_ASSET.address) {
        return {
          ...MOCK_ETH_MAINNET_ASSET,
          balanceFormatted: '1000',
          balanceMinimalUnit: '1000000000000000000',
          balanceFiatNumber: 1000,
          tokenUsdExchangeRate: 1,
          experiences: [
            {
              type: 'POOLED_STAKING',
              apr: '5%',
              estimatedAnnualRewardsFormatted: '50',
              estimatedAnnualRewardsFiatNumber: 50,
              estimatedAnnualRewardsTokenMinimalUnit: '50000000',
              estimatedAnnualRewardsTokenFormatted: '50',
            },
          ],
          experience: {
            type: 'POOLED_STAKING',
            apr: '5%',
            estimatedAnnualRewardsFormatted: '50',
            estimatedAnnualRewardsFiatNumber: 50,
            estimatedAnnualRewardsTokenMinimalUnit: '50000000',
            estimatedAnnualRewardsTokenFormatted: '50',
          },
        };
      }
      return null;
    }),
    getOutputToken: jest.fn().mockImplementation((token) => {
      if (token.address === MOCK_STAKED_ETH_MAINNET_ASSET.address) {
        return {
          ...MOCK_STAKED_ETH_MAINNET_ASSET,
          balanceFormatted: '1000',
          balanceMinimalUnit: '1000000000000000000',
          balanceFiatNumber: 1000,
          tokenUsdExchangeRate: 1,
          experiences: [
            {
              type: 'POOLED_STAKING',
              apr: '5%',
              estimatedAnnualRewardsFormatted: '50',
              estimatedAnnualRewardsFiatNumber: 50,
              estimatedAnnualRewardsTokenMinimalUnit: '50000000',
              estimatedAnnualRewardsTokenFormatted: '50',
            },
          ],
          experience: {
            type: 'POOLED_STAKING',
            apr: '5%',
            estimatedAnnualRewardsFormatted: '50',
            estimatedAnnualRewardsFiatNumber: 50,
            estimatedAnnualRewardsTokenMinimalUnit: '50000000',
            estimatedAnnualRewardsTokenFormatted: '50',
          },
        };
      }
      return null;
    }),
    getPairedEarnTokens: jest.fn().mockImplementation((token) => {
      if (token.symbol === MOCK_ETH_MAINNET_ASSET.symbol) {
        return {
          earnToken: {
            ...MOCK_ETH_MAINNET_ASSET,
            balanceFormatted: '1000',
            balanceMinimalUnit: '1000000000000000000',
            balanceFiatNumber: 1000,
            tokenUsdExchangeRate: 1,
            experiences: [
              {
                type: 'POOLED_STAKING',
                apr: '5%',
                estimatedAnnualRewardsFormatted: '50',
                estimatedAnnualRewardsFiatNumber: 50,
                estimatedAnnualRewardsTokenMinimalUnit: '50000000',
                estimatedAnnualRewardsTokenFormatted: '50',
              },
            ],
            experience: {
              type: 'POOLED_STAKING',
              apr: '5%',
              estimatedAnnualRewardsFormatted: '50',
              estimatedAnnualRewardsFiatNumber: 50,
              estimatedAnnualRewardsTokenMinimalUnit: '50000000',
              estimatedAnnualRewardsTokenFormatted: '50',
            },
          },
          outputToken: {
            ...MOCK_STAKED_ETH_MAINNET_ASSET,
            balanceFormatted: '1000',
            balanceMinimalUnit: '1000000000000000000',
            balanceFiatNumber: 1000,
            tokenUsdExchangeRate: 1,
            experiences: [
              {
                type: 'POOLED_STAKING',
                apr: '5%',
                estimatedAnnualRewardsFormatted: '50',
                estimatedAnnualRewardsFiatNumber: 50,
                estimatedAnnualRewardsTokenMinimalUnit: '50000000',
                estimatedAnnualRewardsTokenFormatted: '50',
              },
            ],
            experience: {
              type: 'POOLED_STAKING',
              apr: '5%',
              estimatedAnnualRewardsFormatted: '50',
              estimatedAnnualRewardsFiatNumber: 50,
              estimatedAnnualRewardsTokenMinimalUnit: '50000000',
              estimatedAnnualRewardsTokenFormatted: '50',
            },
          },
        };
      }
      if (token.symbol === MOCK_USDC_MAINNET_ASSET.symbol) {
        return {
          earnToken: {
            ...MOCK_USDC_MAINNET_ASSET,
            balanceFormatted: '1000',
            balanceMinimalUnit: '1000000000',
            balanceFiatNumber: 1000,
            tokenUsdExchangeRate: 1,
            experiences: [
              {
                type: 'STABLECOIN_LENDING',
                apr: '5%',
                estimatedAnnualRewardsFormatted: '50',
                estimatedAnnualRewardsFiatNumber: 50,
                estimatedAnnualRewardsTokenMinimalUnit: '50000000',
                estimatedAnnualRewardsTokenFormatted: '50',
              },
            ],
            experience: {
              type: 'STABLECOIN_LENDING',
              apr: '5%',
              estimatedAnnualRewardsFormatted: '50',
              estimatedAnnualRewardsFiatNumber: 50,
              estimatedAnnualRewardsTokenMinimalUnit: '50000000',
              estimatedAnnualRewardsTokenFormatted: '50',
            },
          },
          outputToken: {
            ...MOCK_USDC_MAINNET_ASSET,
            balanceFormatted: '1000',
            balanceMinimalUnit: '1000000000',
            balanceFiatNumber: 1000,
            tokenUsdExchangeRate: 1,
            experiences: [
              {
                type: 'STABLECOIN_LENDING',
                apr: '5%',
                estimatedAnnualRewardsFormatted: '50',
                estimatedAnnualRewardsFiatNumber: 50,
                estimatedAnnualRewardsTokenMinimalUnit: '50000000',
                estimatedAnnualRewardsTokenFormatted: '50',
              },
            ],
            experience: {
              type: 'STABLECOIN_LENDING',
              apr: '5%',
              estimatedAnnualRewardsFormatted: '50',
              estimatedAnnualRewardsFiatNumber: 50,
              estimatedAnnualRewardsTokenMinimalUnit: '50000000',
              estimatedAnnualRewardsTokenFormatted: '50',
            },
          },
        };
      }
      return { earnToken: null, outputToken: null };
    }),
    getEarnExperience: jest.fn().mockImplementation((token) => {
      if (token.symbol === MOCK_ETH_MAINNET_ASSET.symbol) {
        return {
          type: 'POOLED_STAKING',
          apr: '5%',
          estimatedAnnualRewardsFormatted: '50',
          estimatedAnnualRewardsFiatNumber: 50,
          estimatedAnnualRewardsTokenMinimalUnit: '50000000',
          estimatedAnnualRewardsTokenFormatted: '50',
        };
      }
      if (token.symbol === MOCK_USDC_MAINNET_ASSET.symbol) {
        return {
          type: 'STABLECOIN_LENDING',
          apr: '5%',
          estimatedAnnualRewardsFormatted: '50',
          estimatedAnnualRewardsFiatNumber: 50,
          estimatedAnnualRewardsTokenMinimalUnit: '50000000',
          estimatedAnnualRewardsTokenFormatted: '50',
        };
      }
      return null;
    }),
    getEstimatedAnnualRewardsForAmount: jest.fn().mockReturnValue({
      estimatedAnnualRewardsFormatted: '50',
      estimatedAnnualRewardsFiatNumber: 50,
      estimatedAnnualRewardsTokenMinimalUnit: '50000000',
      estimatedAnnualRewardsTokenFormatted: '50',
    }),
  }),
}));

jest.mock('../../utils/tempLending', () => ({
  getAaveV3MaxRiskAwareWithdrawalAmount: jest
    .fn()
    .mockResolvedValue('1000000000000000000'),
  calculateAaveV3HealthFactorAfterWithdrawal: jest
    .fn()
    .mockResolvedValue('1.5'),
  getLendingPoolLiquidity: jest.fn().mockResolvedValue('1000000000000000000'),
}));

// Default mock for useEarnWithdrawInput that will be overridden in specific tests
const mockUseEarnWithdrawInput = jest.fn();
jest.mock('../../../Earn/hooks/useEarnWithdrawInput', () => ({
  __esModule: true,
  default: mockUseEarnWithdrawInput,
}));

describe('EarnWithdrawInputView', () => {
  const selectConfirmationRedesignFlagsMock = jest.mocked(
    selectConfirmationRedesignFlags,
  );
  const mockGetStakingNavbar = jest.mocked(getStakingNavbar);
  const mockTrackEvent = jest.fn();
  const useMetricsMock = jest.mocked(useMetrics);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Setup global useMetrics mock for all tests
    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);

    // Default mock for useEarnWithdrawInput
    mockUseEarnWithdrawInput.mockReturnValue({
      isFiat: false,
      currentCurrency: 'ETH',
      isNonZeroAmount: false,
      amountToken: '0',
      amountTokenMinimalUnit: new BN4('0'),
      amountFiatNumber: 0,
      isOverMaximum: {
        isOverMaximumToken: false,
        isOverMaximumEth: false,
      },
      handleCurrencySwitch: jest.fn(),
      currencyToggleValue: '0 USD',
      percentageOptions: [0.25, 0.5, 0.75],
      handleQuickAmountPress: jest.fn(),
      handleKeypadChange: jest.fn(),
      earnBalanceValue: '5.79133 ETH',
    });

    selectConfirmationRedesignFlagsMock.mockReturnValue({
      staking_confirmations: false,
    } as unknown as ConfirmationRedesignRemoteFlags);
  });

  it('render matches snapshot', () => {
    render(EarnWithdrawInputView);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('when values are entered in the keypad', () => {
    it('updates ETH and fiat values', async () => {
      render(EarnWithdrawInputView);

      await act(async () => {
        fireEvent.press(screen.getByText('2'));
      });

      expect(screen.getByText('4000 USD')).toBeTruthy();
    });
  });

  describe('currency toggle functionality', () => {
    it('switches between ETH and fiat correctly', () => {
      render(EarnWithdrawInputView);

      expect(screen.getByText('ETH')).toBeTruthy();
      fireEvent.press(screen.getByText('0 USD'));

      expect(screen.getByText('USD')).toBeTruthy();
    });
  });

  describe('quick amount buttons', () => {
    it('handles 25% quick amount button press correctly', () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('25%'));

      expect(screen.getByText('1.44783')).toBeTruthy();
    });
  });

  describe('withdraw button states', () => {
    it('displays `Enter amount` if input is 0', () => {
      render(EarnWithdrawInputView);

      expect(screen.getByText('Enter amount')).toBeTruthy();
    });

    it('displays `Review` on withdraw button if input is valid', () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('1'));

      expect(screen.getByText('Review')).toBeTruthy();
    });

    it('displays `Not enough ETH` when input exceeds balance', () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('8'));
      expect(screen.queryAllByText('Not enough ETH')).toHaveLength(2);
    });
  });

  describe('when staking_confirmations feature flag is enabled', () => {
    let originalMock: jest.Mock;
    let mockAttemptUnstakeTransaction: jest.Mock;

    beforeEach(() => {
      originalMock = jest.requireMock(
        '../../../../../selectors/featureFlagController',
      ).selectConfirmationRedesignFlags as jest.Mock;

      jest.requireMock(
        '../../../../../selectors/featureFlagController',
      ).selectConfirmationRedesignFlags = jest.fn(() => ({
        staking_confirmations: true,
      }));

      mockAttemptUnstakeTransaction = jest.fn().mockResolvedValue(undefined);
      jest.requireMock('../../../Stake/hooks/usePoolStakedUnstake').default =
        () => ({
          attemptUnstakeTransaction: mockAttemptUnstakeTransaction,
        });

      selectConfirmationRedesignFlagsMock.mockReturnValue({
        staking_confirmations: true,
      } as unknown as ConfirmationRedesignRemoteFlags);
    });

    afterEach(() => {
      jest.requireMock(
        '../../../../../selectors/featureFlagController',
      ).selectConfirmationRedesignFlags = originalMock;
    });

    it('calls attemptUnstakeTransaction when Review button is pressed', async () => {
      const { getByText } = render(EarnWithdrawInputView);

      jest.useFakeTimers({ legacyFakeTimers: true });

      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      await act(async () => {
        fireEvent.press(screen.getByText('Review'));
      });

      await flushPromises();

      expect(mockAttemptUnstakeTransaction).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: expect.objectContaining({
          amountWei: expect.any(String),
          amountFiat: expect.any(String),
        }),
      });
    });
  });

  describe('title bar', () => {
    it('renders "Withdraw" for pooled-staking withdrawals', () => {
      render(EarnWithdrawInputView);

      expect(mockGetStakingNavbar).toHaveBeenCalledWith(
        'Withdraw',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('renders "Withdraw" for supported stablecoin lending assets', () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValueOnce(true);

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1000',
        balanceMinimalUnit: '1000000000',
        balanceFiatNumber: 1000,
        tokenUsdExchangeRate: 1,
        experiences: [
          {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '5%',
            estimatedAnnualRewardsFormatted: '50',
            estimatedAnnualRewardsFiatNumber: 50,
            estimatedAnnualRewardsTokenMinimalUnit: '50000000',
            estimatedAnnualRewardsTokenFormatted: '50',
          },
        ],
        experience: {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '5%',
          estimatedAnnualRewardsFormatted: '50',
          estimatedAnnualRewardsFiatNumber: 50,
          estimatedAnnualRewardsTokenMinimalUnit: '50000000',
          estimatedAnnualRewardsTokenFormatted: '50',
        },
      };

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState,
            },
          },
        },
        usdcRouteParams,
      );

      expect(mockGetStakingNavbar).toHaveBeenCalledWith(
        'Withdraw',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('max risk-aware withdrawal amount', () => {
    it('displays max risk-aware withdrawal amount for lending tokens', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1000',
        balanceMinimalUnit: '1000000000',
        balanceFiatNumber: 1000,
        tokenUsdExchangeRate: 1,
        experiences: [
          {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '5%',
            estimatedAnnualRewardsFormatted: '50',
            estimatedAnnualRewardsFiatNumber: 50,
            estimatedAnnualRewardsTokenMinimalUnit: '50000000',
            estimatedAnnualRewardsTokenFormatted: '50',
            market: {
              id: '0x123',
              chainId: 1,
              protocol: LendingProtocol.AAVE,
              name: 'USDC Market',
              address: '0x123',
              netSupplyRate: 5.0,
              totalSupplyRate: 5.0,
              rewards: [],
              tvlUnderlying: '1000000',
              underlying: {
                address: '0x123',
                chainId: 1,
              },
              outputToken: {
                address: '0x456',
                chainId: 1,
              },
              position: {
                id: '0x123-0x456-COLLATERAL-0',
                chainId: 1,
                assets: '1000000',
                marketId: '0x123',
                marketAddress: '0x123',
                protocol: LendingProtocol.AAVE,
              },
            },
          },
        ],
        experience: {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '5%',
          estimatedAnnualRewardsFormatted: '50',
          estimatedAnnualRewardsFiatNumber: 50,
          estimatedAnnualRewardsTokenMinimalUnit: '50000000',
          estimatedAnnualRewardsTokenFormatted: '50',
          market: {
            id: '0x123',
            chainId: 1,
            protocol: LendingProtocol.AAVE,
            name: 'USDC Market',
            address: '0x123',
            netSupplyRate: 5.0,
            totalSupplyRate: 5.0,
            rewards: [],
            tvlUnderlying: '1000000',
            underlying: {
              address: '0x123',
              chainId: 1,
            },
            outputToken: {
              address: '0x456',
              chainId: 1,
            },
            position: {
              id: '0x123-0x456-COLLATERAL-0',
              chainId: 1,
              assets: '1000000',
              marketId: '0x123',
              marketAddress: '0x123',
              protocol: LendingProtocol.AAVE,
            },
          },
        },
      };

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState: {
                ...backgroundState,
                AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
              },
            },
          },
        },
        usdcRouteParams,
      );

      expect(getAaveV3MaxRiskAwareWithdrawalAmount).toHaveBeenCalledWith(
        '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
        {
          ...MOCK_USDC_MAINNET_ASSET,
          balanceFormatted: '1000',
          balanceMinimalUnit: '1000000000',
          balanceFiatNumber: 1000,
          tokenUsdExchangeRate: 1,
          experiences: [
            {
              type: 'STABLECOIN_LENDING',
              apr: '5%',
              estimatedAnnualRewardsFormatted: '50',
              estimatedAnnualRewardsFiatNumber: 50,
              estimatedAnnualRewardsTokenMinimalUnit: '50000000',
              estimatedAnnualRewardsTokenFormatted: '50',
            },
          ],
          experience: {
            type: 'STABLECOIN_LENDING',
            apr: '5%',
            estimatedAnnualRewardsFormatted: '50',
            estimatedAnnualRewardsFiatNumber: 50,
            estimatedAnnualRewardsTokenMinimalUnit: '50000000',
            estimatedAnnualRewardsTokenFormatted: '50',
          },
        },
      );
    });
  });

  describe('navigation events', () => {
    it('tracks unstake button click event', async () => {
      render(EarnWithdrawInputView);

      await act(async () => {
        fireEvent.press(screen.getByText('1'));
      });

      await act(async () => {
        fireEvent.press(screen.getByText('Review'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.UNSTAKE_CONFIRMATION,
        params: {
          amountWei: '1000000000000000000',
          amountFiat: '2000',
        },
      });
    });
  });

  describe('Analytics', () => {
    it('should track EARN_INPUT_OPENED on render for stablecoin lending withdrawal', () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const mockExperience = {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '50',
        estimatedAnnualRewardsFiatNumber: 50,
        estimatedAnnualRewardsTokenMinimalUnit: '50000000',
        estimatedAnnualRewardsTokenFormatted: '50',
      };

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1000',
        balanceMinimalUnit: '1000000000',
        balanceFiatNumber: 1000,
        tokenUsdExchangeRate: 1,
        experience: mockExperience,
        experiences: [mockExperience],
      };

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState,
            },
          },
        },
        usdcRouteParams,
      );

      // Verify the analytics event was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn input opened',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: '5.79133 ETH', // This comes from the mock data
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should not track EARN_INPUT_OPENED for staking flows', () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(false);

      mockTrackEvent.mockClear();

      render(EarnWithdrawInputView);

      // Should not call stablecoin lending events
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn input opened',
        }),
      );
    });

    it('should track EARN_REVIEW_BUTTON_CLICKED for stablecoin lending withdrawals', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const mockExperience2 = {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '50',
        estimatedAnnualRewardsFiatNumber: 50,
        estimatedAnnualRewardsTokenMinimalUnit: '50000000',
        estimatedAnnualRewardsTokenFormatted: '50',
        market: {
          id: '0x123',
          chainId: 1,
          protocol: LendingProtocol.AAVE,
          name: 'USDC Market',
          address: '0x123',
          netSupplyRate: 5.0,
          totalSupplyRate: 5.0,
          rewards: [],
          tvlUnderlying: '1000000',
          underlying: {
            address: '0x123',
            chainId: 1,
          },
          outputToken: {
            address: '0x456',
            chainId: 1,
          },
          position: {
            id: '0x123-0x456-COLLATERAL-0',
            chainId: 1,
            assets: '1000000',
            marketId: '0x123',
            marketAddress: '0x123',
            protocol: LendingProtocol.AAVE,
          },
        },
      };

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1000',
        balanceMinimalUnit: '1000000000',
        balanceFiatNumber: 1000,
        tokenUsdExchangeRate: 1,
        experience: mockExperience2,
        experiences: [mockExperience2],
      };

      // Override mock to enable Review button
      mockUseEarnWithdrawInput.mockReturnValue({
        isFiat: false,
        currentCurrency: 'USDC',
        isNonZeroAmount: true, // This enables the Review button
        amountToken: '250', // 25% of 1000
        amountTokenMinimalUnit: new BN4('250000000'), // 250 USDC in minimal units
        amountFiatNumber: 250,
        isOverMaximum: {
          isOverMaximumToken: false,
          isOverMaximumEth: false,
        },
        handleCurrencySwitch: jest.fn(),
        currencyToggleValue: '$250',
        percentageOptions: [0.25, 0.5, 0.75],
        handleQuickAmountPress: jest.fn(),
        handleKeypadChange: jest.fn(),
        earnBalanceValue: '1000 USDC',
      });

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      const { getByTestId } = renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState: {
                ...backgroundState,
                AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
              },
            },
          },
        },
        usdcRouteParams,
      );

      mockTrackEvent.mockClear();

      // Simulate the 25% button being pressed (mocked via useEarnWithdrawInput values above)
      // Click the Review button using testID to ensure we find it reliably
      await act(async () => {
        fireEvent.press(getByTestId('review-button'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn review button clicked',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: '1000 USDC',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    }, 10000); // Increase timeout to 10 seconds

    it('should track EARN_INPUT_VALUE_CHANGED for quick amount button press', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const mockExperience3 = {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '50',
        estimatedAnnualRewardsFiatNumber: 50,
        estimatedAnnualRewardsTokenMinimalUnit: '50000000',
        estimatedAnnualRewardsTokenFormatted: '50',
      };

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1000',
        balanceMinimalUnit: '1000000000',
        balanceFiatNumber: 1000,
        tokenUsdExchangeRate: 1,
        experience: mockExperience3,
        experiences: [mockExperience3],
      };

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      const { getByText } = renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState,
            },
          },
        },
        usdcRouteParams,
      );

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Input value changed',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            input_value: '25%',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: '5.79133 ETH',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should track EARN_INPUT_VALUE_CHANGED for max button press', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const mockExperience4 = {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '50',
        estimatedAnnualRewardsFiatNumber: 50,
        estimatedAnnualRewardsTokenMinimalUnit: '50000000',
        estimatedAnnualRewardsTokenFormatted: '50',
      };

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1000',
        balanceMinimalUnit: '1000000000',
        balanceFiatNumber: 1000,
        tokenUsdExchangeRate: 1,
        experience: mockExperience4,
        experiences: [mockExperience4],
      };

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      const { getByText } = renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState,
            },
          },
        },
        usdcRouteParams,
      );

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Input value changed',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            input_value: 'Max',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: '5.79133 ETH',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should track EARN_INPUT_CURRENCY_SWITCH_CLICKED for stablecoin lending', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const mockExperience5 = {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '50',
        estimatedAnnualRewardsFiatNumber: 50,
        estimatedAnnualRewardsTokenMinimalUnit: '50000000',
        estimatedAnnualRewardsTokenFormatted: '50',
      };

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1000',
        balanceMinimalUnit: '1000000000',
        balanceFiatNumber: 1000,
        tokenUsdExchangeRate: 1,
        experience: mockExperience5,
        experiences: [mockExperience5],
      };

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      const { getByText } = renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState,
            },
          },
        },
        usdcRouteParams,
      );

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('$0'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn Input Currency Switch Clicked',
          properties: expect.objectContaining({
            selected_provider: 'consensys',
            text: 'Currency Switch Clicked',
            location: 'EarnWithdrawalInputView',
            currency_type: 'fiat',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should track EARN_INPUT_INSUFFICIENT_BALANCE when balance is exceeded', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const mockExperience6 = {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '0.05',
        estimatedAnnualRewardsFiatNumber: 0.05,
        estimatedAnnualRewardsTokenMinimalUnit: '50000',
        estimatedAnnualRewardsTokenFormatted: '0.05',
      };

      const mockLendingToken: EarnTokenDetails = {
        ...MOCK_USDC_MAINNET_ASSET,
        balanceFormatted: '1',
        balanceMinimalUnit: '1000000',
        balanceFiatNumber: 1,
        tokenUsdExchangeRate: 1,
        experience: mockExperience6,
        experiences: [mockExperience6],
      };

      // Override the mock to simulate balance exceeded scenario
      mockUseEarnWithdrawInput.mockReturnValue({
        isFiat: false,
        currentCurrency: 'USDC',
        isNonZeroAmount: true,
        amountToken: '5',
        amountTokenMinimalUnit: new BN4('5000000'), // 5 USDC in minimal units
        amountFiatNumber: 5,
        isOverMaximum: {
          isOverMaximumToken: true, // This will trigger the insufficient balance event
          isOverMaximumEth: false,
        },
        handleCurrencySwitch: jest.fn(),
        currencyToggleValue: '$5',
        percentageOptions: [0.25, 0.5, 0.75],
        handleQuickAmountPress: jest.fn(),
        handleKeypadChange: jest.fn(),
        earnBalanceValue: '1 USDC', // Small balance
      });

      const usdcRouteParams: EarnWithdrawInputViewProps['route']['params'] = {
        token: mockLendingToken,
      };

      renderScreen(
        EarnWithdrawInputView,
        {
          name: Routes.STAKING.UNSTAKE,
        },
        {
          state: {
            engine: {
              backgroundState,
            },
          },
        },
        usdcRouteParams,
      );

      mockTrackEvent.mockClear();

      // Give time for the useEffect to trigger with isOverMaximum.isOverMaximumToken = true
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Allow time for effects to run
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Earn input insufficient balance',
            properties: expect.objectContaining({
              provider: 'consensys',
              location: 'EarnWithdrawalInputView',
              token_name: 'USDC',
              token: 'USDC',
              network: 'Ethereum Mainnet',
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
              action_type: 'withdrawal',
            }),
          }),
        );
      });
    });
  });
});

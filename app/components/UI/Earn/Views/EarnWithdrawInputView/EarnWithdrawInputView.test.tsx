import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import BN4 from 'bnjs4';
import React, { act } from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import {
  ConfirmationRedesignRemoteFlags,
  selectConfirmationRedesignFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_GET_VAULT_RESPONSE,
  MOCK_STAKED_ETH_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
} from '../../../Stake/__mocks__/stakeMockData';
import EarnWithdrawInputView from './EarnWithdrawInputView';
import { EarnWithdrawInputViewProps } from './EarnWithdrawInputView.types';
import { flushPromises } from '../../../../../util/test/utils';
import { getStakingNavbar } from '../../../Navbar';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { getAaveV3MaxRiskAwareWithdrawalAmount } from '../../utils/tempLending';
import { EarnTokenDetails } from '../../types/lending.types';

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
      if (token.address === MOCK_ETH_MAINNET_ASSET.address) {
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
      if (token.address === MOCK_USDC_MAINNET_ASSET.address) {
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
      if (token.address === MOCK_ETH_MAINNET_ASSET.address) {
        return {
          type: 'POOLED_STAKING',
          apr: '5%',
          estimatedAnnualRewardsFormatted: '50',
          estimatedAnnualRewardsFiatNumber: 50,
          estimatedAnnualRewardsTokenMinimalUnit: '50000000',
          estimatedAnnualRewardsTokenFormatted: '50',
        };
      }
      if (token.address === MOCK_USDC_MAINNET_ASSET.address) {
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

jest.mock('../../hooks/useEarnWithdrawInput', () => ({
  __esModule: true,
  default: () => ({
    isFiat: false,
    currentCurrency: 'USD',
    isNonZeroAmount: false,
    amountToken: '0',
    amountTokenMinimalUnit: '0',
    amountFiatNumber: 0,
    isOverMaximum: {
      isOverMaximumToken: false,
      isOverMaximumEth: false,
    },
    handleCurrencySwitch: jest.fn(),
    currencyToggleValue: 'ETH',
    percentageOptions: ['25%', '50%', '75%', '100%'],
    handleQuickAmountPress: jest.fn(),
    handleKeypadChange: jest.fn(),
    earnBalanceValue: '5.79133',
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

describe('EarnWithdrawalInputView', () => {
  const selectConfirmationRedesignFlagsMock = jest.mocked(
    selectConfirmationRedesignFlags,
  );
  const mockGetStakingNavbar = jest.mocked(getStakingNavbar);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    selectConfirmationRedesignFlagsMock.mockReturnValue({
      staking_confirmations: false,
    } as unknown as ConfirmationRedesignRemoteFlags);
  });

  it('render matches snapshot', () => {
    render(EarnWithdrawInputView);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe.only('when values are entered in the keypad', () => {
    it('updates ETH and fiat values', async () => {
      render(EarnWithdrawInputView);

      await act(async () => {
        fireEvent.press(screen.getByText('2'));
      });

      await waitFor(() => {
        expect(screen.getByText('4000 USD')).toBeTruthy();
      });
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
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('1'));

      fireEvent.press(screen.getByText('Review'));

      jest.useFakeTimers({ legacyFakeTimers: true });
      await flushPromises();

      expect(mockAttemptUnstakeTransaction).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_WITHDRAWAL,
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
        'Unstake ETH',
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

  describe('lending withdrawal flow', () => {
    beforeEach(() => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);
    });

    it('fetches max risk-aware withdrawal amount for lending tokens', async () => {
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

      await flushPromises();

      expect(getAaveV3MaxRiskAwareWithdrawalAmount).toHaveBeenCalled();
    });
  });
});

import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import BN4 from 'bnjs4';
import React from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import useMetrics from '../../../../hooks/useMetrics/useMetrics';

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
import { TokenI } from '../../../Tokens/types';
import { trace, TraceName } from '../../../../../util/trace';
import { MAINNET_DISPLAY_NAME } from '../../../../../core/Engine/constants';

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
  selectMultichainAssetsRates: jest.fn(() => ({})),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
  })),
}));

const mockBalanceBN = new BN4('1000000000000000000');

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();

let mockRouteToken: TokenI | undefined;

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
      getParent: () => ({
        pop: mockPop,
      }),
    }),
    useRoute: () => ({
      params: {
        // Need stable token reference to prevent infinite rerendering in tests.
        token: mockRouteToken,
      },
    }),
  };
});

const baseProps: EarnWithdrawInputViewProps = {
  route: {
    params: {
      token: MOCK_ETH_MAINNET_ASSET,
    },
    key: Routes.STAKING.UNSTAKE,
    name: 'params',
  },
};

function render(
  Component: React.ComponentType,
  mockToken: TokenI | EarnTokenDetails = MOCK_ETH_MAINNET_ASSET,
) {
  mockRouteToken = mockToken;

  return renderScreen(
    Component,
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
    baseProps.route.params,
  );
}

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

jest.mock(
  '../../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: jest.fn(() => true),
  }),
);

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

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
}));

jest.mock('react-native-fade-in-image', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      placeholderStyle,
    }: {
      children: React.ReactNode;
      placeholderStyle?: unknown;
    }) => React.createElement(View, { style: placeholderStyle }, children),
  };
});

describe('EarnWithdrawInputView', () => {
  const mockGetStakingNavbar = jest.mocked(getStakingNavbar);
  const mockTrackEvent = jest.fn();
  const useMetricsMock = jest.mocked(useMetrics);
  const mockTrace = jest.mocked(trace);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Reset route.param.token
    mockRouteToken = undefined;

    // Setup global useMetrics mock for all tests
    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);
  });

  it('render matches snapshot', async () => {
    render(EarnWithdrawInputView);

    await waitFor(async () => {
      expect(screen.toJSON()).toMatchSnapshot();
    });
  });

  describe('when values are entered in the keypad', () => {
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

    it('handles Max button press and sets full balance', async () => {
      render(EarnWithdrawInputView);

      await act(async () => {
        fireEvent.press(screen.getByText('Max'));
      });

      expect(screen.getByText('5.79133')).toBeTruthy();
    });

    it('tracks quick amount button press for staking flows', async () => {
      render(EarnWithdrawInputView);

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(screen.getByText('50%'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Unstake Input Quick Amount Clicked',
          properties: expect.objectContaining({
            location: 'UnstakeInputView',
            amount: 0.5,
            is_max: false,
            mode: 'native',
            experience: EARN_EXPERIENCES.POOLED_STAKING,
          }),
        }),
      );
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

  describe('unstake transaction flow', () => {
    let mockAttemptUnstakeTransaction: jest.Mock;

    beforeEach(() => {
      mockAttemptUnstakeTransaction = jest.fn().mockResolvedValue(undefined);
      jest.requireMock('../../../Stake/hooks/usePoolStakedUnstake').default =
        () => ({
          attemptUnstakeTransaction: mockAttemptUnstakeTransaction,
        });
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
    it('renders "Unstake <token name>" for pooled-staking withdrawals', () => {
      render(EarnWithdrawInputView);

      expect(mockGetStakingNavbar).toHaveBeenCalledWith(
        'Unstake ETH',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        null,
      );
    });

    it('renders "Withdraw <token name>" for supported stablecoin lending assets', () => {
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

      render(EarnWithdrawInputView, mockLendingToken);

      expect(mockGetStakingNavbar).toHaveBeenCalledWith(
        'Withdraw USDC',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        null,
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

      render(EarnWithdrawInputView, mockLendingToken);

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

    it('displays error when withdrawal amount exceeds safe limit', async () => {
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      (getAaveV3MaxRiskAwareWithdrawalAmount as jest.Mock).mockResolvedValue(
        '100000',
      );

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

      const { getByText } = render(EarnWithdrawInputView, mockLendingToken);

      await act(async () => {
        fireEvent.press(getByText('5'));
      });

      await waitFor(() => {
        expect(
          screen.queryAllByText('Amount exceeds safe withdrawal limit'),
        ).toHaveLength(2);
      });
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
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          amountWei: '1000000000000000000',
          amountFiat: '2000',
        },
      });
    });
  });

  describe('TRON unstake flow', () => {
    it('renders Unstake label when TRX staking is enabled and TRON asset is used', async () => {
      const tronToken: TokenI = {
        name: 'Tron',
        symbol: 'TRX',
        ticker: 'TRX',
        chainId: 'tron:728126428',
        address: 'tron:728126428/slip44:195',
        decimals: 6,
        balance: '1000',
        balanceFiat: '$100',
        isNative: true,
      } as unknown as TokenI;

      render(EarnWithdrawInputView, tronToken);

      await act(async () => {
        fireEvent.press(screen.getByText('1'));
      });
      await waitFor(() => {
        expect(screen.getAllByText('Unstake')[0]).toBeTruthy();
      });
    });

    it('replaces Max button with Done when non-zero amount is entered', async () => {
      const tronToken: TokenI = {
        name: 'Tron',
        symbol: 'TRX',
        ticker: 'TRX',
        chainId: 'tron:728126428',
        address: 'tron:728126428/slip44:195',
        decimals: 6,
        balance: '1000',
        balanceFiat: '$100',
        isNative: true,
      } as unknown as TokenI;

      const { getByText, queryByText } = render(
        EarnWithdrawInputView,
        tronToken,
      );

      expect(getByText('Max')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      await waitFor(() => {
        expect(queryByText('Max')).toBeNull();
        expect(getByText('Done')).toBeTruthy();
      });
    });
  });

  describe('Analytics', () => {
    it('tracks EARN_INPUT_OPENED on render for stablecoin lending withdrawal', () => {
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

      render(EarnWithdrawInputView, mockLendingToken);

      // Verify the analytics event was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn input opened',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: MAINNET_DISPLAY_NAME,
            token: 'USDC',
            token_name: 'USDC',
            user_token_balance: '1000',
          },
        }),
      );
    });

    it.skip('tracks EARN_REVIEW_BUTTON_CLICKED for stablecoin lending withdrawals', async () => {
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

      mockRouteToken = mockLendingToken;

      const { getByText, getByTestId } = renderScreen(
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
      );

      // Simulate the 25% button being pressed (mocked via useEarnWithdrawInput values above)
      const quickAmountButton = getByText('25%');

      await act(async () => {
        fireEvent.press(quickAmountButton);
      });

      // Click the Review button using testID to ensure we find it reliably
      const reviewButton = getByTestId('review-button');

      await act(async () => {
        fireEvent.press(reviewButton);
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(3);

      expect(mockTrackEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: 'Earn input opened',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: MAINNET_DISPLAY_NAME,
            token: 'USDC',
            token_name: 'USDC',
            user_token_balance: '1000',
          },
        }),
      );

      expect(mockTrackEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: 'Input value changed',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            input_value: '25%',
            is_max: false,
            network: MAINNET_DISPLAY_NAME,
            token: 'USDC',
            user_token_balance: '1000',
          },
        }),
      );

      expect(mockTrackEvent).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          name: 'Earn Review button clicked',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            lastQuickAmountButtonPressed: '25%',
            network: MAINNET_DISPLAY_NAME,
            token: 'USDC',
            transaction_value: '250 USDC',
            user_token_balance: '1000',
          },
        }),
      );
    });

    it.skip('should track EARN_INPUT_VALUE_CHANGED for quick amount button press', async () => {
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

      const { getByText } = render(EarnWithdrawInputView, mockLendingToken);

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Unstake Input Quick Amount Clicked',
          properties: {
            amount: 0.25,
            experience: 'STABLECOIN_LENDING',
            is_max: false,
            location: 'UnstakeInputView',
            mode: 'native',
            network: MAINNET_DISPLAY_NAME,
            token: 'Ethereum',
            user_token_balance: '1000',
          },
        }),
      );
    });

    it.skip('should track EARN_INPUT_VALUE_CHANGED for max button press', async () => {
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

      const { getByText } = render(EarnWithdrawInputView, mockLendingToken);

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Unstake Input Quick Amount Clicked',
          properties: {
            amount: 1,
            experience: 'STABLECOIN_LENDING',
            is_max: true,
            location: 'UnstakeInputView',
            mode: 'native',
            network: MAINNET_DISPLAY_NAME,
            token: 'Ethereum',
            user_token_balance: '1000',
          },
        }),
      );
    });

    it.skip('should track EARN_INPUT_CURRENCY_SWITCH_CLICKED for stablecoin lending', async () => {
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

      const { getByText } = render(EarnWithdrawInputView, mockLendingToken);

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('$0'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Unstake Input Currency Switch Clicked',
          properties: {
            currency_type: 'fiat',
            experience: 'POOLED_STAKING',
            location: 'UnstakeInputView',
            selected_provider: 'consensys',
            text: 'Currency Switch Trigger',
          },
        }),
      );
    });

    it.skip('should track EARN_INPUT_INSUFFICIENT_BALANCE when balance is exceeded', async () => {
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

      render(EarnWithdrawInputView, mockLendingToken);

      mockTrackEvent.mockClear();

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
              network: MAINNET_DISPLAY_NAME,
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
              action_type: 'withdrawal',
            }),
          }),
        );
      });
    });
  });

  describe('Tracing', () => {
    describe('Pooled Staking flow tracing', () => {
      it('calls trace with EarnWithdrawConfirmationScreen when redesigned confirmations are enabled', async () => {
        const mockAttemptUnstakeTransaction = jest.fn().mockResolvedValue({});
        jest.requireMock('../../../Stake/hooks/usePoolStakedUnstake').default =
          () => ({
            attemptUnstakeTransaction: mockAttemptUnstakeTransaction,
          });

        const { getByText } = render(EarnWithdrawInputView);

        fireEvent.press(getByText('1'));

        await act(async () => {
          fireEvent.press(screen.getByText('Review'));
        });

        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.EarnWithdrawConfirmationScreen,
          data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
        });
      });
    });
  });
});

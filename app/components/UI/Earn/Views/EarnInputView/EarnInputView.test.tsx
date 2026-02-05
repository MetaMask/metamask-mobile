import { BNToHex } from '@metamask/controller-utils';
import {
  ChainId,
  LendingProvider,
  PooledStakingContract,
} from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';
import BN4 from 'bnjs4';
import { BigNumber as EthersBigNumber, Contract } from 'ethers';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { RootState } from '../../../../../reducers';

import { toWei, weiToFiatNumber } from '../../../../../util/number';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderScreen,
} from '../../../../../util/test/renderWithProvider';
import { flushPromises } from '../../../../../util/test/utils';
import useMetrics from '../../../../hooks/useMetrics/useMetrics';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_GET_VAULT_RESPONSE,
} from '../../../Stake/__mocks__/stakeMockData';
import { MOCK_VAULT_APY_AVERAGES } from '../../../Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';
import { EVENT_PROVIDERS } from '../../../Stake/constants/events';
import { EVENT_LOCATIONS } from '../../constants/events/earnEvents';
// eslint-disable-next-line import/no-namespace
import * as useBalance from '../../../Stake/hooks/useBalance';
import usePoolStakedDeposit from '../../../Stake/hooks/usePoolStakedDeposit';
// eslint-disable-next-line import/no-namespace
import Engine from '../../../../../core/Engine';
// eslint-disable-next-line import/no-namespace
import * as useEarnGasFee from '../../../Earn/hooks/useEarnGasFee';
// eslint-disable-next-line import/no-namespace
import * as multichainAccountsSelectors from '../../../../../selectors/multichainAccounts/accounts';
import {
  createMockToken,
  getCreateMockTokenOptions,
} from '../../../Stake/testUtils';
import { TOKENS_WITH_DEFAULT_OPTIONS } from '../../../Stake/testUtils/testUtils.types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { useEarnMetadata } from '../../hooks/useEarnMetadata';
import useEarnTokens from '../../hooks/useEarnTokens';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import EarnInputView from './EarnInputView';
import { EarnInputViewProps } from './EarnInputView.types';
import { Stake } from '../../../Stake/sdk/stakeSdkProvider';
import { selectConversionRate } from '../../../../../selectors/currencyRateController';
import { trace, TraceName } from '../../../../../util/trace';
import { MAINNET_DISPLAY_NAME } from '../../../../../core/Engine/constants';
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';

jest.mock('lodash', () => {
  const actual = jest.requireActual('lodash');
  return {
    ...actual,
    debounce: jest.fn((fn) => fn),
  };
});

jest.mock('../../hooks/useEarnMetadata', () => ({
  useEarnMetadata: jest.fn(() => ({
    annualRewardRate: '50%',
    annualRewardRateDecimal: 0.5,
    annualRewardRateValue: 50,
    isLoadingEarnMetadata: false,
  })),
}));

const MOCK_USDC_MAINNET_ASSET = createMockToken({
  ...getCreateMockTokenOptions(
    CHAIN_IDS.MAINNET,
    TOKENS_WITH_DEFAULT_OPTIONS.USDC,
  ),
  address: '0x123232',
  balanceFiat: '$33.23',
});

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();
const mockConversionRate = 2000;

jest.mock('../../../../../core/Engine', () => ({
  context: {
    EarnController: {
      getLendingTokenAllowance: jest.fn(),
    },
    TransactionController: {
      addTransactionBatch: jest
        .fn()
        .mockResolvedValue({ batchId: '0x123456789abcdef' }),
    },
  },
}));

jest.mock('../../hooks/useEarnTokens', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getEarnToken: jest.fn(),
    getOutputToken: jest.fn(),
  })),
}));

jest.mock('../../../../hooks/useMetrics/useMetrics');

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      reset: mockReset,
      goBack: mockGoBack,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

jest.mock('../../../../../selectors/currencyRateController.ts', () => ({
  selectConversionRate: jest.fn(() => mockConversionRate),
  selectCurrentCurrency: jest.fn(() => 'USD'),
  selectCurrencyRates: jest.fn(() => ({
    ETH: {
      conversionRate: mockConversionRate,
    },
  })),
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
    address: MOCK_ADDRESS_2,
  })),
}));

jest.mock('../../../../../selectors/featureFlagController/confirmations');

jest.mock(
  '../../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: jest.fn(() => false),
  }),
);

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
}));

const mockBalanceBN = toWei('1.5'); // 1.5 ETH
const mockGasFeeBN = new BN4('100000000000000');
const mockPooledStakingContractService: PooledStakingContract = {
  chainId: ChainId.ETHEREUM,
  contract: new Contract('0x0000000000000000000000000000000000000000', []),
  convertToShares: jest.fn(),
  encodeClaimExitedAssetsTransactionData: jest.fn(),
  encodeDepositTransactionData: jest.fn(),
  encodeEnterExitQueueTransactionData: jest.fn(),
  encodeMulticallTransactionData: jest.fn(),
  estimateClaimExitedAssetsGas: jest.fn(),
  estimateDepositGas: jest.fn(),
  estimateEnterExitQueueGas: jest.fn(),
  estimateMulticallGas: jest.fn(),
  getShares: jest.fn(),
};

jest.mock('../../selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

const mockLendingContracts = {
  aave: {
    '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2': {
      estimateDepositGas: jest.fn(),
      encodeDepositTransactionData: jest.fn(),
      estimateWithdrawGas: jest.fn(),
      encodeWithdrawTransactionData: jest.fn(),
      estimateUnderlyingTokenApproveGas: jest.fn(),
      encodeUnderlyingTokenApproveTransactionData: jest.fn(),
      underlyingTokenAllowance: jest.fn(),
      maxWithdraw: jest.fn(),
      maxDeposit: jest.fn(),
    } as unknown as LendingProvider,
  },
};

jest.mock('../../../Stake/hooks/useStakeContext.ts', () => ({
  useStakeContext: jest.fn(() => {
    const stakeContext: Stake = {
      stakingContract: mockPooledStakingContractService,
      lendingContracts: mockLendingContracts,
      networkClientId: 'test network client id',
    };
    return stakeContext;
  }),
}));

jest.mock('../../../Stake/hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    balanceETH: '1.5',
    balanceWei: mockBalanceBN,
    balanceFiatNumber: '3000',
  }),
}));

jest.mock('../../../Earn/hooks/useEarnGasFee', () => ({
  __esModule: true,
  default: () => ({
    estimatedEarnGasFeeWei: mockGasFeeBN,
    isLoadingEarnGasFee: false,
    isEarnGasFeeError: false,
    refreshEarnGasValues: jest.fn(),
    getEstimatedEarnGasFee: jest.fn(),
  }),
}));

// Mock hooks
jest.mock('../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest.fn(),
  }),
}));

jest.mock('../../../Stake/hooks/useVaultApyAverages', () => ({
  __esModule: true,
  default: () => ({
    vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
    isLoadingVaultApyAverages: false,
    refreshVaultApyAverages: jest.fn(),
  }),
}));

const mockVaultMetadata = MOCK_GET_VAULT_RESPONSE;

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

jest.mock('../../../Stake/hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../utils/tempLending', () => ({
  generateLendingAllowanceIncreaseTransaction: jest.fn(() => ({
    txParams: {
      to: '0x123232', // Token contract address
      from: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
      data: '0xapprovedata',
      value: '0x0',
    },
  })),
  generateLendingDepositTransaction: jest.fn(() => ({
    txParams: {
      to: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // AAVE pool contract
      from: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
      data: '0xdepositdata',
      value: '0x0',
    },
  })),
}));

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      TokenBalancesController: {
        tokenBalances: {
          [MOCK_ADDRESS_2.toLowerCase()]: {
            [CHAIN_IDS.MAINNET]: {
              [MOCK_USDC_MAINNET_ASSET.address]: BNToHex(
                new BigNumber('1000000'),
              ),
            },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        currencyRates: {
          ETH: { conversionRate: 2000 },
        },
      },
      TokenRatesController: {
        marketData: {
          [CHAIN_IDS.MAINNET]: {
            [MOCK_USDC_MAINNET_ASSET.address]: { price: 1 },
          },
        },
      },
    },
  },
};

describe('EarnInputView', () => {
  const usePoolStakedDepositMock = jest.mocked(usePoolStakedDeposit);
  const selectStablecoinLendingEnabledFlagMock = jest.mocked(
    selectStablecoinLendingEnabledFlag,
  );

  const selectConversionRateMock = jest.mocked(selectConversionRate);
  const mockTrace = jest.mocked(trace);

  const baseProps: EarnInputViewProps = {
    route: {
      params: {
        token: MOCK_ETH_MAINNET_ASSET,
      },
      key: Routes.STAKING.STAKE,
      name: 'params',
    },
  };
  const mockTrackEvent = jest.fn();
  const useMetricsMock = jest.mocked(useMetrics);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset the mocked function to default value
    usePoolStakedDepositMock.mockReturnValue({
      attemptDepositTransaction: jest.fn(),
    });
    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);

    selectStablecoinLendingEnabledFlagMock.mockReturnValue(false);

    (selectTrxStakingEnabled as unknown as jest.Mock).mockReturnValue(false);

    (useEarnTokens as jest.Mock).mockReturnValue({
      getEarnToken: jest.fn(() => ({
        ...MOCK_ETH_MAINNET_ASSET,
        balance: '1.5',
        balanceFiat: '$3000',
        balanceWei: mockBalanceBN,
        balanceMinimalUnit: mockBalanceBN,
        balanceFiatNumber: 6000,
        isStaked: false,
        isNative: true,
        isETH: true,
        experiences: [
          {
            type: 'POOLED_STAKING',
            apr: '50',
            estimatedAnnualRewardsFormatted: '0.00946 ETH',
            estimatedAnnualRewardsFiatNumber: 0.00946,
            estimatedAnnualRewardsTokenMinimalUnit: '0.00946',
            estimatedAnnualRewardsTokenFormatted: '0.00946 ETH',
          },
        ],
        experience: {
          type: 'POOLED_STAKING',
          apr: '50',
          estimatedAnnualRewardsFormatted: '0.00946 ETH',
          estimatedAnnualRewardsFiatNumber: 0.00946,
          estimatedAnnualRewardsTokenMinimalUnit: '0.00946',
          estimatedAnnualRewardsTokenFormatted: '0.00946 ETH',
        },
      })),
      getOutputToken: jest.fn(() => ({
        ...MOCK_ETH_MAINNET_ASSET,
        name: 'Staked ETH',
        symbol: 'stETH',
        decimals: 18,
        balance: '1.5',
        balanceFiat: '$3000',
        balanceWei: mockBalanceBN,
        balanceMinimalUnit: mockBalanceBN,
        balanceFiatNumber: 6000,
        isStaked: true,
        isNative: true,
        isETH: true,
        experiences: [
          {
            type: 'STABLECOIN_LENDING',
            apr: '2.5%',
            estimatedAnnualRewardsFormatted: '0.00946 ETH',
            estimatedAnnualRewardsFiatNumber: 0.00946,
            estimatedAnnualRewardsTokenMinimalUnit: '0.00946',
            estimatedAnnualRewardsTokenFormatted: '0.00946 ETH',
          },
        ],
        experience: {
          type: 'STABLECOIN_LENDING',
          apr: '2.5%',
          estimatedAnnualRewardsFormatted: '0.00946 ETH',
          estimatedAnnualRewardsFiatNumber: 0.00946,
          estimatedAnnualRewardsTokenMinimalUnit: '0.00946',
          estimatedAnnualRewardsTokenFormatted: '0.00946 ETH',
        },
      })),
    });

    (useEarnMetadata as jest.Mock).mockReturnValue({
      annualRewardRate: '50%',
      annualRewardRateDecimal: 0.5,
      isLoadingEarnMetadata: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function render(
    Component: React.ComponentType,
    route: EarnInputViewProps['route'] = baseProps.route,
    state: DeepPartial<RootState> = mockInitialState,
  ) {
    return renderScreen(
      Component,
      {
        name: Routes.STAKING.STAKE,
      },
      {
        state: { ...mockInitialState, ...state },
      },
      { ...baseProps.route.params, ...route.params },
    );
  }

  const renderComponent = () => render(EarnInputView);

  it('render matches snapshot', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  describe('when erc20 token is selected', () => {
    it('renders the correct "Supply <token name>" for stablecoin lending', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      selectConversionRateMock.mockReturnValueOnce(1);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
          address: '0x123232',
          balance: '100',
          balanceFiat: '$100',
          balanceWei: new BN4('100000000'), // 100 USDC in minimal units (6 decimals)
          balanceMinimalUnit: '100000000', // 100 USDC in minimal units (6 decimals)
          balanceFiatNumber: 100,
          balanceFormatted: '100 USDC',
          tokenUsdExchangeRate: 1,
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '2.5%',
            estimatedAnnualRewardsFormatted: '$3.00',
            estimatedAnnualRewardsFiatNumber: 3,
            estimatedAnnualRewardsTokenMinimalUnit: '3000000',
            estimatedAnnualRewardsTokenFormatted: '3 USDC',
            market: {
              protocol: 'AAVE v3',
              underlying: {
                address: MOCK_USDC_MAINNET_ASSET.address,
              },
            },
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
        })),
      });

      const { getByText, getAllByText } = render(EarnInputView, {
        params: {
          ...baseProps.route.params,
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      // Verify the title is rendered in the HeaderCompactStandard component
      expect(getByText('Supply USDC')).toBeTruthy();

      // "0" in the input display and on the keypad
      expect(getAllByText('0').length).toBe(2);
      // "USDC" in the input display and in the token selector
      expect(getAllByText('USDC').length).toBe(2);
      expect(getByText('$0')).toBeDefined();

      // Token Selector should display USDC as selected token
      expect(getByText('2.5% APR')).toBeDefined();
      expect(getByText('100 USDC')).toBeDefined();

      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      expect(getByText('$1')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('TRON staking flow', () => {
    it('constructs TRX earnToken and shows the ResourceToggle when staking enabled', () => {
      (selectTrxStakingEnabled as unknown as jest.Mock).mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          name: 'TRON',
          symbol: 'TRX',
          ticker: 'TRX',
          chainId: 'tron:728126428',
          address: 'TEFik7dGm6r5Y1Af9mGwnELuJLa1jXDDUB',
          isNative: true,
          isETH: false,
          decimals: 6,
          balance: '0',
          balanceMinimalUnit: '0',
          balanceFormatted: '0 TRX',
          balanceFiat: '$0',
          tokenUsdExchangeRate: 0,
          experiences: [{ type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' }],
          experience: { type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' },
        })),
        getOutputToken: jest.fn(() => undefined),
      });

      const TRX_TOKEN = {
        name: 'TRON',
        symbol: 'TRX',
        ticker: 'TRX',
        chainId: 'tron:728126428',
        isNative: true,
        address: 'TEFik7dGm6r5Y1Af9mGwnELuJLa1jXDDUB',
        balance: '0',
        balanceFiat: '$0',
        isETH: false,
      } as unknown as typeof MOCK_ETH_MAINNET_ASSET;

      const { getByTestId } = render(EarnInputView, {
        params: {
          token: TRX_TOKEN,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      expect(getByTestId('resource-toggle-energy')).toBeTruthy();
      expect(getByTestId('resource-toggle-bandwidth')).toBeTruthy();
    });

    it('renders TRX earnToken with non-zero balance from selector', () => {
      (selectTrxStakingEnabled as unknown as jest.Mock).mockReturnValue(true);

      const TRX_TOKEN = {
        name: 'TRON',
        symbol: 'TRX',
        ticker: 'TRX',
        chainId: 'tron:728126428',
        isNative: true,
        address: 'TEFik7dGm6r5Y1Af9mGwnELuJLa1jXDDUB',
        balance: '100',
        balanceFiat: '$100',
        decimals: 6,
        isETH: false,
      } as unknown as typeof MOCK_ETH_MAINNET_ASSET;

      const mockGetEarnToken = jest.fn(() => ({
        ...TRX_TOKEN,
        balanceMinimalUnit: '100000000',
        balanceFormatted: '100 TRX',
        balanceFiatNumber: 100,
        tokenUsdExchangeRate: 1,
        experiences: [{ type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' }],
        experience: { type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' },
      }));

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: mockGetEarnToken,
        getOutputToken: jest.fn(() => undefined),
      });

      const { getByTestId } = render(EarnInputView, {
        params: {
          token: TRX_TOKEN,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      // Verify getEarnToken was called with the token
      expect(mockGetEarnToken).toHaveBeenCalledWith(TRX_TOKEN);
      // Verify TRX-specific UI elements are rendered
      expect(getByTestId('resource-toggle-energy')).toBeTruthy();
      expect(getByTestId('resource-toggle-bandwidth')).toBeTruthy();
    });

    it('replaces Max button with Done when non-zero amount is entered', async () => {
      (selectTrxStakingEnabled as unknown as jest.Mock).mockReturnValue(true);

      const TRX_TOKEN = {
        name: 'TRON',
        symbol: 'TRX',
        ticker: 'TRX',
        chainId: 'tron:728126428',
        isNative: true,
        address: 'TEFik7dGm6r5Y1Af9mGwnELuJLa1jXDDUB',
        balance: '100',
        balanceFiat: '$100',
        decimals: 6,
        isETH: false,
      } as unknown as typeof MOCK_ETH_MAINNET_ASSET;

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...TRX_TOKEN,
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 TRX',
          balanceFiatNumber: 100,
          tokenUsdExchangeRate: 1,
          experiences: [{ type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' }],
          experience: { type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' },
        })),
        getOutputToken: jest.fn(() => undefined),
      });

      const { getByText, queryByText } = render(EarnInputView, {
        params: {
          token: TRX_TOKEN,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      expect(getByText('Max')).toBeTruthy();
      expect(queryByText(strings('onboarding_success.done'))).toBeNull();

      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      expect(queryByText('Max')).toBeNull();
      expect(getByText(strings('onboarding_success.done'))).toBeOnTheScreen();
    });

    it('does not show MaxInputModal when Max button is pressed for TRX', async () => {
      (selectTrxStakingEnabled as unknown as jest.Mock).mockReturnValue(true);

      const TRX_TOKEN = {
        name: 'TRON',
        symbol: 'TRX',
        ticker: 'TRX',
        chainId: 'tron:728126428',
        isNative: true,
        address: 'TEFik7dGm6r5Y1Af9mGwnELuJLa1jXDDUB',
        balance: '100',
        balanceFiat: '$100',
        decimals: 6,
        isETH: false,
      } as unknown as typeof MOCK_ETH_MAINNET_ASSET;

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...TRX_TOKEN,
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 TRX',
          balanceFiatNumber: 100,
          tokenUsdExchangeRate: 1,
          experiences: [{ type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' }],
          experience: { type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' },
        })),
        getOutputToken: jest.fn(() => undefined),
      });

      const { getByText } = render(EarnInputView, {
        params: {
          token: TRX_TOKEN,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        'StakeModals',
        expect.objectContaining({
          screen: Routes.STAKING.MODALS.MAX_INPUT,
        }),
      );
    });
  });

  describe('when values are entered in the keypad', () => {
    it('updates ETH and fiat values', async () => {
      const { toJSON, getByText } = renderComponent();

      expect(toJSON()).toMatchSnapshot();

      await act(async () => {
        fireEvent.press(getByText('2'));
      });

      expect(getByText('4000 USD')).toBeTruthy();
    });
  });

  describe('currency toggle functionality', () => {
    it('switches between ETH and fiat correctly', async () => {
      const { getByText } = renderComponent();

      expect(getByText('ETH')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('0 USD'));
      });

      expect(getByText('USD')).toBeTruthy();
    });
  });

  describe('quick amount buttons', () => {
    it('handles 25% quick amount button press correctly', () => {
      const { getByText } = renderComponent();

      fireEvent.press(getByText('25%'));

      expect(getByText('0.375')).toBeTruthy();
    });
  });

  describe('stake button states', () => {
    it('displays `Enter amount` if input is 0', () => {
      const { getByText } = renderComponent();

      expect(getByText('Enter amount')).toBeTruthy();
    });

    it('displays `Review` on stake button if input is valid', () => {
      const { getByText } = renderComponent();

      fireEvent.press(getByText('1'));
      expect(getByText('Review')).toBeTruthy();
    });

    it('displays `Not enough ETH` when input exceeds balance', () => {
      const { getByText, queryAllByText } = renderComponent();

      fireEvent.press(getByText('4'));
      expect(queryAllByText('Not enough ETH')).toHaveLength(2);
    });
  });

  describe('navigates to ', () => {
    it('gas impact modal when gas cost is 30% or more of deposit amount', async () => {
      const mockUseStakingGasFee = jest.spyOn(useEarnGasFee, 'default');
      const mockUseBalance = jest.spyOn(useBalance, 'default');
      const useBalanceMockData = {
        balanceFiatNumber: weiToFiatNumber(
          mockBalanceBN,
          mockConversionRate,
          2,
        ),
        balanceETH: '1.5',
        balanceWei: mockBalanceBN,
      } as ReturnType<(typeof useBalance)['default']>;
      mockUseBalance.mockImplementation(() => useBalanceMockData);
      mockUseStakingGasFee.mockImplementation(() => ({
        estimatedEarnGasFeeWei: toWei('0.25'),
        isLoadingEarnGasFee: false,
        isEarnGasFeeError: false,
        refreshEarnGasValues: jest.fn(),
        getEstimatedEarnGasFee: jest.fn(),
      }));

      const { getByText } = renderComponent();

      fireEvent.press(getByText('25%'));

      fireEvent.press(getByText(strings('stake.review')));

      expect(mockNavigate).toHaveBeenCalledTimes(1);

      expect(mockNavigate).toHaveBeenLastCalledWith('StakeModals', {
        screen: Routes.STAKING.MODALS.GAS_IMPACT,
        params: {
          amountFiat: '750',
          amountWei: '375000000000000000',
          annualRewardRate: '50%',
          annualRewardsFiat: '375 USD',
          annualRewardsToken: '0.1875 ETH',
          estimatedGasFee: '0.25',
          estimatedGasFeePercentage: '66%',
          chainId: CHAIN_IDS.MAINNET,
        },
      });
    });

    it('redesigned stake deposit confirmation view', async () => {
      const attemptDepositTransactionMock = jest.fn().mockResolvedValue({});
      // Override the mock value for this specific test

      usePoolStakedDepositMock.mockReturnValue({
        attemptDepositTransaction: attemptDepositTransactionMock,
      });

      const { getByText } = renderComponent();

      fireEvent.press(getByText('25%'));

      fireEvent.press(getByText(strings('stake.review')));

      jest.useFakeTimers({ legacyFakeTimers: true });
      // Wait for approval to be processed
      await flushPromises();

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenLastCalledWith('StakeScreens', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });

      expect(attemptDepositTransactionMock).toHaveBeenCalledTimes(1);
      expect(attemptDepositTransactionMock).toHaveBeenCalledWith(
        '375000000000000000',
        MOCK_ADDRESS_2,
        undefined,
        true,
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            is_redesigned: true,
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            tokens_to_stake_native_value: '0.375',
            tokens_to_stake_usd_value: '750',
          }),
        }),
      );
    });

    it('stake confirmation view', async () => {
      const attemptDepositTransactionMock = jest.fn().mockResolvedValue({});

      usePoolStakedDepositMock.mockReturnValue({
        attemptDepositTransaction: attemptDepositTransactionMock,
      });

      const { getByText } = renderComponent();

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      await act(async () => {
        fireEvent.press(getByText(strings('stake.review')));
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenLastCalledWith('StakeScreens', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });
    });

    it('earn lending deposit view to increase token allowance', async () => {
      selectConversionRateMock.mockReturnValueOnce(1);
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);
      const getErc20SpendingLimitSpy = jest
        .spyOn(Engine.context.EarnController, 'getLendingTokenAllowance')
        .mockResolvedValue(EthersBigNumber.from('0'));
      (useEarnMetadata as jest.Mock).mockReturnValue({
        annualRewardRate: '2.5%',
        annualRewardRateDecimal: 0.025,
        isLoadingEarnMetadata: false,
      });
      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
          address: '0x123232',
          balance: '100',
          balanceFiat: '$100',
          balanceWei: new BN4('100000000'), // 100 USDC in minimal units (6 decimals)
          balanceMinimalUnit: '100000000', // 100 USDC in minimal units (6 decimals)
          balanceFiatNumber: 100,
          tokenUsdExchangeRate: 1,
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '2.5%',
            estimatedAnnualRewardsFormatted: '$3.00',
            estimatedAnnualRewardsFiatNumber: 3,
            estimatedAnnualRewardsTokenMinimalUnit: '3000000',
            estimatedAnnualRewardsTokenFormatted: '3 USDC',
            market: {
              protocol: 'AAVE v3',
              underlying: {
                address: MOCK_USDC_MAINNET_ASSET.address,
              },
            },
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getByText } = render(EarnInputView, routeParamsWithUSDC);

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      await act(async () => {
        fireEvent.press(getByText(strings('stake.review')));
      });

      expect(getErc20SpendingLimitSpy).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
          screen: Routes.EARN.LENDING_DEPOSIT_CONFIRMATION,
          params: expect.objectContaining({
            action: 'ALLOWANCE_INCREASE',
            amountTokenMinimalUnit: '25000000',
            annualRewardRate: '2.5%',
            lendingProtocol: 'AAVE v3',
          }),
        });
      });
    });

    it('earn lending deposit view to deposit tokens', async () => {
      selectConversionRateMock.mockReturnValueOnce(1);
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);
      const getErc20SpendingLimitSpy = jest
        .spyOn(Engine.context.EarnController, 'getLendingTokenAllowance')
        .mockResolvedValue(EthersBigNumber.from('0'));
      (useEarnMetadata as jest.Mock).mockReturnValue({
        annualRewardRate: '2.5%',
        annualRewardRateDecimal: 0.025,
        isLoadingEarnMetadata: false,
      });
      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
          address: '0x123232',
          balance: '100',
          balanceFiat: '$100',
          balanceWei: new BN4('100000000'), // 100 USDC in minimal units (6 decimals)
          balanceMinimalUnit: '100000000', // 100 USDC in minimal units (6 decimals)
          balanceFiatNumber: 100,
          tokenUsdExchangeRate: 1,
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '2.5%',
            estimatedAnnualRewardsFormatted: '$3.00',
            estimatedAnnualRewardsFiatNumber: 3,
            estimatedAnnualRewardsTokenMinimalUnit: '3000000',
            estimatedAnnualRewardsTokenFormatted: '3 USDC',
            market: {
              protocol: 'AAVE v3',
              underlying: {
                address: MOCK_USDC_MAINNET_ASSET.address,
              },
            },
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
        })),
      });

      // User has exact allowance needed to directly deposit
      (
        Engine.context.EarnController.getLendingTokenAllowance as jest.Mock
      ).mockResolvedValue('25000000');

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getByText } = render(EarnInputView, routeParamsWithUSDC);

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      await act(async () => {
        fireEvent.press(getByText(strings('stake.review')));
      });

      expect(getErc20SpendingLimitSpy).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
          screen: Routes.EARN.LENDING_DEPOSIT_CONFIRMATION,
          params: expect.objectContaining({
            action: 'DEPOSIT',
            amountTokenMinimalUnit: '25000000',
            annualRewardRate: '2.5%',
            lendingProtocol: 'AAVE v3',
          }),
        });
      });
    });

    it.skip('navigates to redesigned lending deposit confirmation', async () => {
      // Enable stablecoin lending feature flag
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      // Enable redesigned staking confirmations flag

      const getErc20SpendingLimitSpy = jest
        .spyOn(Engine.context.EarnController, 'getLendingTokenAllowance')
        .mockResolvedValue(EthersBigNumber.from('0'));

      try {
        (useEarnMetadata as jest.Mock).mockReturnValue({
          annualRewardRate: '2.5%',
          annualRewardRateDecimal: 0.025,
          isLoadingEarnMetadata: false,
        });

        (useEarnTokens as jest.Mock).mockReturnValue({
          getEarnToken: jest.fn(() => ({
            ...MOCK_USDC_MAINNET_ASSET,
            chainId: CHAIN_IDS.MAINNET,
            address: '0x123232',
            balance: '100',
            balanceFiat: '$100',
            balanceWei: new BN4('100000000'), // 100 USDC in minimal units (6 decimals)
            balanceMinimalUnit: '100000000', // 100 USDC in minimal units (6 decimals)
            balanceFiatNumber: 100,
            tokenUsdExchangeRate: 1,
            experience: {
              type: EARN_EXPERIENCES.STABLECOIN_LENDING,
              apr: '2.5%',
              estimatedAnnualRewardsFormatted: '$3.00',
              estimatedAnnualRewardsFiatNumber: 3,
              estimatedAnnualRewardsTokenMinimalUnit: '3000000',
              estimatedAnnualRewardsTokenFormatted: '3 USDC',
              market: {
                protocol: 'AAVE v3',
                underlying: {
                  address: MOCK_USDC_MAINNET_ASSET.address,
                },
              },
            },
          })),
          getOutputToken: jest.fn(() => ({
            ...MOCK_USDC_MAINNET_ASSET,
            chainId: CHAIN_IDS.MAINNET,
          })),
        });

        const routeParamsWithUSDC: EarnInputViewProps['route'] = {
          params: {
            token: MOCK_USDC_MAINNET_ASSET,
          },
          key: Routes.STAKING.STAKE,
          name: 'params',
        };

        const { getByText } = render(EarnInputView, routeParamsWithUSDC);

        await act(async () => {
          fireEvent.press(getByText('25%'));
        });

        await act(async () => {
          fireEvent.press(getByText(strings('stake.review')));
        });

        expect(getErc20SpendingLimitSpy).toHaveBeenCalledTimes(1);

        await waitFor(() => {
          // Should call addTransactionBatch instead of navigating to legacy flow
          expect(
            Engine.context.TransactionController.addTransactionBatch,
          ).toHaveBeenCalledTimes(1);
          expect(
            Engine.context.TransactionController.addTransactionBatch,
          ).toHaveBeenCalledWith({
            from: MOCK_ADDRESS_2,
            networkClientId: 'mainnet',
            origin: 'metamask',
            transactions: [
              {
                params: {
                  to: '0x123232', // Token contract address
                  from: MOCK_ADDRESS_2,
                  data: '0xapprovedata',
                  value: '0x0',
                },
                type: 'approve',
              },
              {
                params: {
                  to: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // AAVE pool contract (mixed case)
                  from: MOCK_ADDRESS_2,
                  data: '0xdepositdata',
                  value: '0x0',
                },
                type: 'lendingDeposit',
              },
            ],
            requireApproval: true,
          });

          // Should navigate to redesigned confirmations instead of legacy lending deposit confirmation
          expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
            screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          });

          // Should NOT navigate to legacy lending deposit confirmation
          expect(mockNavigate).not.toHaveBeenCalledWith(
            Routes.EARN.ROOT,
            expect.any(Object),
          );
        });
      } finally {
        // Clean up the spy to prevent interference with other tests
        getErc20SpendingLimitSpy.mockRestore();
      }
    });
  });

  describe('title bar', () => {
    it('displays "Stake <token name>" for staking', () => {
      // Default mock returns ETH with POOLED_STAKING experience
      const { getByText } = renderComponent();

      // Verify the title is rendered in the HeaderCompactStandard component
      expect(getByText('Stake ETH')).toBeTruthy();
    });
  });

  describe('Analytics', () => {
    it('should track EARN_INPUT_OPENED on render for stablecoin lending', () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          balance: '100',
          balanceFiat: '$100',
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 USDC',
          balanceFiatNumber: 100,
          symbol: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '4.5%',
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          name: 'aUSDC',
          symbol: 'aUSDC',
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      render(EarnInputView, routeParamsWithUSDC);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn input opened',
          properties: expect.objectContaining({
            action_type: 'deposit',
            token: 'USDC',
            network: MAINNET_DISPLAY_NAME,
            user_token_balance: '100 USDC',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should not track EARN_INPUT_OPENED for staking flows', () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(false);
      mockTrackEvent.mockClear();

      renderComponent();

      // Should not call stablecoin lending events
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn input opened',
        }),
      );
    });

    it('should track EARN_REVIEW_BUTTON_CLICKED for stablecoin lending deposits', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);
      const getErc20SpendingLimitSpy = jest
        .spyOn(Engine.context.EarnController, 'getLendingTokenAllowance')
        .mockResolvedValue(EthersBigNumber.from('1000000000'));

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
          address: '0x123232',
          balance: '100',
          balanceFiat: '$100',
          balanceWei: new BN4('100000000'), // 100 USDC in minimal units (6 decimals)
          balanceMinimalUnit: '100000000', // 100 USDC in minimal units (6 decimals)
          balanceFiatNumber: 100,
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '2.5%',
            market: {
              protocol: 'AAVE v3',
              underlying: {
                address: MOCK_USDC_MAINNET_ASSET.address,
              },
            },
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getByText } = render(EarnInputView, routeParamsWithUSDC);

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      await act(async () => {
        fireEvent.press(getByText(strings('stake.review')));
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Earn Review button clicked',
            properties: expect.objectContaining({
              action_type: 'deposit',
              token: 'USDC',
              network: MAINNET_DISPLAY_NAME,
              transaction_value: expect.stringContaining('USDC'),
              location: 'EarnInputView',
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            }),
          }),
        );
      });

      getErc20SpendingLimitSpy.mockRestore();
    });

    it('should track EARN_INPUT_VALUE_CHANGED for quick amount button press', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          balance: '100',
          balanceFiat: '$100',
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 USDC',
          balanceFiatNumber: 100,
          symbol: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '4.5%',
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          name: 'aUSDC',
          symbol: 'aUSDC',
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: {
            ...MOCK_USDC_MAINNET_ASSET,
          },
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getByText } = render(EarnInputView, routeParamsWithUSDC);

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Input value changed',
          properties: expect.objectContaining({
            action_type: 'deposit',
            input_value: '25%',
            token: 'USDC',
            network: MAINNET_DISPLAY_NAME,
            user_token_balance: '100 USDC',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should track EARN_INPUT_VALUE_CHANGED for max button press', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          balance: '100',
          balanceFiat: '$100',
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 USDC',
          balanceFiatNumber: 100,
          symbol: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '4.5%',
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          name: 'aUSDC',
          symbol: 'aUSDC',
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: {
            ...MOCK_USDC_MAINNET_ASSET,
          },
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getByText } = render(EarnInputView, routeParamsWithUSDC);

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Input value changed',
          properties: expect.objectContaining({
            action_type: 'deposit',
            input_value: 'Max',
            token: 'USDC',
            network: MAINNET_DISPLAY_NAME,
            user_token_balance: '100 USDC',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should track EARN_INPUT_CURRENCY_SWITCH_CLICKED for stablecoin lending', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          balance: '100',
          balanceFiat: '$100',
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 USDC',
          balanceFiatNumber: 100,
          symbol: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '4.5%',
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          name: 'aUSDC',
          symbol: 'aUSDC',
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: {
            ...MOCK_USDC_MAINNET_ASSET,
          },
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getByText } = render(EarnInputView, routeParamsWithUSDC);

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
            location: 'EarnInputView',
            currency_type: 'fiat',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
          }),
        }),
      );
    });

    it('should track EARN_INPUT_INSUFFICIENT_BALANCE when balance is exceeded', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          balance: '1',
          balanceFiat: '$1',
          balanceMinimalUnit: '1000000',
          balanceFormatted: '1 USDC',
          balanceFiatNumber: 1,
          symbol: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '4.5%',
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          name: 'aUSDC',
          symbol: 'aUSDC',
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: {
            ...MOCK_USDC_MAINNET_ASSET,
          },
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getByText } = render(EarnInputView, routeParamsWithUSDC);

      mockTrackEvent.mockClear();

      // Enter an amount greater than balance
      await act(async () => {
        fireEvent.press(getByText('5'));
      });

      // Allow time for effects to run
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Earn Input Insufficient Balance',
            properties: expect.objectContaining({
              provider: 'consensys',
              location: 'EarnInputView',
              token_name: 'USDC',
              token: 'USDC',
              network: MAINNET_DISPLAY_NAME,
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            }),
          }),
        );
      });
    });
  });

  describe('Tracing', () => {
    describe('Lending flow tracing', () => {
      beforeEach(() => {
        selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);
        (useEarnTokens as jest.Mock).mockReturnValue({
          getEarnToken: jest.fn(() => ({
            ...MOCK_USDC_MAINNET_ASSET,
            address: '0x123232',
            chainId: CHAIN_IDS.MAINNET,
            balance: '1000',
            balanceFiat: '$1000',
            balanceWei: new BN4('1000000000'),
            balanceMinimalUnit: '1000000000',
            balanceFiatNumber: 1000,
            experience: {
              type: EARN_EXPERIENCES.STABLECOIN_LENDING,
              market: {
                protocol: 'AAVE v3',
                underlying: {
                  address: '0x123232',
                },
              },
            },
          })),
          getOutputToken: jest.fn(() => ({
            ...MOCK_USDC_MAINNET_ASSET,
          })),
        });
      });

      it('calls trace with EarnDepositSpendingCapScreen when allowance increase is needed', async () => {
        const mockGetLendingTokenAllowance = jest
          .fn()
          .mockResolvedValue(new BigNumber('0'));
        (
          Engine.context.EarnController.getLendingTokenAllowance as jest.Mock
        ).mockImplementation(mockGetLendingTokenAllowance);

        const { getByText } = render(EarnInputView, {
          params: {
            ...baseProps.route.params,
            token: MOCK_USDC_MAINNET_ASSET,
          },
          key: Routes.STAKING.STAKE,
          name: 'params',
        });

        fireEvent.press(getByText('1'));

        await act(async () => {
          fireEvent.press(getByText('Review'));
        });

        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.EarnDepositSpendingCapScreen,
        });
      });

      it('calls trace with EarnDepositReviewScreen when no allowance increase is needed', async () => {
        const mockGetLendingTokenAllowance = jest
          .fn()
          .mockResolvedValue(new BigNumber('1000000000000000000'));
        (
          Engine.context.EarnController.getLendingTokenAllowance as jest.Mock
        ).mockImplementation(mockGetLendingTokenAllowance);

        const { getByText } = render(EarnInputView, {
          params: {
            ...baseProps.route.params,
            token: MOCK_USDC_MAINNET_ASSET,
          },
          key: Routes.STAKING.STAKE,
          name: 'params',
        });

        fireEvent.press(getByText('1'));

        await act(async () => {
          fireEvent.press(getByText('Review'));
        });

        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.EarnDepositReviewScreen,
        });
      });
    });

    describe('Pooled Staking flow tracing', () => {
      it('calls trace with EarnDepositConfirmationScreen', async () => {
        const attemptDepositTransactionMock = jest.fn().mockResolvedValue({});
        usePoolStakedDepositMock.mockReturnValue({
          attemptDepositTransaction: attemptDepositTransactionMock,
        });

        const { getByText } = renderComponent();

        fireEvent.press(getByText('1'));

        await act(async () => {
          fireEvent.press(getByText('Review'));
        });

        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.EarnDepositConfirmationScreen,
          data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
        });
      });
    });
  });

  describe('Additional edge cases for coverage', () => {
    it('navigates to MAX_INPUT modal for staking when max button pressed', () => {
      const { getByText } = renderComponent();

      const maxButton = getByText('Max');
      fireEvent.press(maxButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        'StakeModals',
        expect.objectContaining({
          screen: Routes.STAKING.MODALS.MAX_INPUT,
        }),
      );
    });

    it('handles missing selectedAccount address gracefully in lending flow', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);
      selectConversionRateMock.mockReturnValue(1);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
          address: '0x123232',
          balance: '100',
          balanceFiat: '$100',
          balanceWei: new BN4('100000000'),
          balanceMinimalUnit: '100000000',
          balanceFiatNumber: 100,
          tokenUsdExchangeRate: 1,
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            market: {
              protocol: 'AAVE v3',
              underlying: {
                address: MOCK_USDC_MAINNET_ASSET.address,
              },
            },
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
        })),
      });

      // Mock selector to return undefined account
      jest
        .spyOn(
          multichainAccountsSelectors,
          'selectSelectedInternalAccountByScope',
        )
        .mockReturnValue(() => undefined);

      const { getByText } = render(EarnInputView, {
        params: { token: MOCK_USDC_MAINNET_ASSET },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      await act(async () => {
        fireEvent.press(getByText('Review'));
      });

      // Should not navigate when selectedAccount is undefined
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles missing earnToken experience market data gracefully', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);
      selectConversionRateMock.mockReturnValue(1);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
          address: '0x123232',
          balance: '100',
          balanceFiat: '$100',
          balanceWei: new BN4('100000000'),
          balanceMinimalUnit: '100000000',
          balanceFiatNumber: 100,
          tokenUsdExchangeRate: 1,
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            // Missing market data
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          chainId: CHAIN_IDS.MAINNET,
        })),
      });

      const { getByText } = render(EarnInputView, {
        params: { token: MOCK_USDC_MAINNET_ASSET },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      await act(async () => {
        fireEvent.press(getByText('Review'));
      });

      // Should not navigate when market data is missing
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles pooled staking when attemptDepositTransaction is undefined', async () => {
      usePoolStakedDepositMock.mockReturnValue({
        attemptDepositTransaction: undefined,
      });

      const { getByText } = renderComponent();

      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      await act(async () => {
        fireEvent.press(getByText('Review'));
      });

      // Should not navigate when attemptDepositTransaction is undefined
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('tracks staking events when shouldLogStakingEvent returns true', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(false);

      const { getByText } = renderComponent();

      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Stake Input Quick Amount Clicked',
          properties: expect.objectContaining({
            location: 'EarnInputView',
            amount: 0.25,
            is_max: false,
            mode: 'native',
            experience: EARN_EXPERIENCES.POOLED_STAKING,
          }),
        }),
      );
    });
  });

  describe('HeaderCompactStandard interactions', () => {
    it('tracks STAKE_CANCEL_CLICKED event with token property when back button is pressed for staking', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(false);

      const { getByTestId } = renderComponent();

      mockTrackEvent.mockClear();

      const backButton = getByTestId('button-icon');
      await act(async () => {
        fireEvent.press(backButton);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Stake Cancel Clicked',
          properties: expect.objectContaining({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
            experience: EARN_EXPERIENCES.POOLED_STAKING,
            token: 'Ethereum',
          }),
        }),
      );
    });

    it('tracks EARN_INPUT_BACK_BUTTON_CLICKED event when back button is pressed for stablecoin lending', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          balance: '100',
          balanceFiat: '$100',
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 USDC',
          balanceFiatNumber: 100,
          symbol: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '4.5%',
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          name: 'aUSDC',
          symbol: 'aUSDC',
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getAllByTestId } = render(EarnInputView, routeParamsWithUSDC);

      mockTrackEvent.mockClear();

      // First button-icon is the back button
      const buttonIcons = getAllByTestId('button-icon');
      const backButton = buttonIcons[0];
      await act(async () => {
        fireEvent.press(backButton);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn Input Back Button Clicked',
          properties: expect.objectContaining({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            token: 'USDC',
          }),
        }),
      );
    });

    it('tracks TOOLTIP_OPENED event when info button is pressed for stablecoin lending', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      (useEarnTokens as jest.Mock).mockReturnValue({
        getEarnToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          balance: '100',
          balanceFiat: '$100',
          balanceMinimalUnit: '100000000',
          balanceFormatted: '100 USDC',
          balanceFiatNumber: 100,
          symbol: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '4.5%',
          },
        })),
        getOutputToken: jest.fn(() => ({
          ...MOCK_USDC_MAINNET_ASSET,
          name: 'aUSDC',
          symbol: 'aUSDC',
        })),
      });

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      };

      const { getAllByTestId } = render(EarnInputView, routeParamsWithUSDC);

      mockTrackEvent.mockClear();

      // Second button-icon is the info button (when stablecoin lending is enabled)
      const buttonIcons = getAllByTestId('button-icon');
      const infoButton = buttonIcons[1];
      await act(async () => {
        fireEvent.press(infoButton);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tooltip Opened',
          properties: expect.objectContaining({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Tooltip Opened',
            location: EVENT_LOCATIONS.EARN_INPUT_VIEW,
            tooltip_name: 'Lending Historic Market APY Graph',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            token: 'USDC',
          }),
        }),
      );
    });
  });
});

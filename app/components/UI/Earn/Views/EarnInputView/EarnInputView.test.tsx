import { BNToHex } from '@metamask/controller-utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';
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
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
// eslint-disable-next-line import/no-namespace
import {
  ConfirmationRedesignRemoteFlags,
  selectConfirmationRedesignFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
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
import { getStakingNavbar } from '../../../Navbar';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_GET_VAULT_RESPONSE,
} from '../../../Stake/__mocks__/stakeMockData';
import { MOCK_VAULT_APY_AVERAGES } from '../../../Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';
import { EVENT_PROVIDERS } from '../../../Stake/constants/events';
// eslint-disable-next-line import/no-namespace
import * as useBalance from '../../../Stake/hooks/useBalance';
import usePoolStakedDeposit from '../../../Stake/hooks/usePoolStakedDeposit';
// eslint-disable-next-line import/no-namespace
import Engine from '../../../../../core/Engine';
// eslint-disable-next-line import/no-namespace
import * as useEarnGasFee from '../../../Earn/hooks/useEarnGasFee';
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
import { getIsRedesignedStablecoinLendingScreenEnabled } from './utils';
import { selectConversionRate } from '../../../../../selectors/currencyRateController';

jest.mock('./utils');

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

jest.mock('../../../Navbar', () => ({
  getStakingNavbar: jest.fn().mockReturnValue({}),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      reset: mockReset,
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
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock('../../../../../selectors/featureFlagController/confirmations');

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

jest.mock('./utils', () => ({
  __esModule: true,
  getIsRedesignedStablecoinLendingScreenEnabled: jest.fn(() => false),
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
  const selectConfirmationRedesignFlagsMock = jest.mocked(
    selectConfirmationRedesignFlags,
  );
  const selectSelectedInternalAccountMock = jest.mocked(
    selectSelectedInternalAccount,
  );
  const selectStablecoinLendingEnabledFlagMock = jest.mocked(
    selectStablecoinLendingEnabledFlag,
  );

  const selectConversionRateMock = jest.mocked(selectConversionRate);

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
  const mockGetStakingNavbar = jest.mocked(getStakingNavbar);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset the mocked function to default value
    (
      getIsRedesignedStablecoinLendingScreenEnabled as jest.Mock
    ).mockReturnValue(false);

    selectSelectedInternalAccountMock.mockImplementation(
      () =>
        ({
          address: MOCK_ADDRESS_2,
        } as InternalAccount),
    );
    selectConfirmationRedesignFlagsMock.mockReturnValue({
      staking_confirmations: false,
    } as unknown as ConfirmationRedesignRemoteFlags);
    usePoolStakedDepositMock.mockReturnValue({
      attemptDepositTransaction: jest.fn(),
    });
    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);

    selectStablecoinLendingEnabledFlagMock.mockReturnValue(false);

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
    (getIsRedesignedStablecoinLendingScreenEnabled as jest.Mock).mockClear();
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
    it('renders the correct USDC token', async () => {
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

      expect(mockGetStakingNavbar).toHaveBeenCalledWith(
        'Deposit',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

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

  describe('when calculating rewards', () => {
    it('calculates estimated annual rewards based on input', () => {
      const { getByText } = renderComponent();

      fireEvent.press(getByText('1'));

      expect(getByText('0.5 ETH')).toBeTruthy();
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

    it('navigates to Learn more modal when learn icon is pressed', () => {
      const { getByLabelText } = renderComponent();
      fireEvent.press(getByLabelText('Learn More'));
      expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
        screen: Routes.STAKING.MODALS.LEARN_MORE,
        params: {
          chainId: CHAIN_IDS.MAINNET,
        },
      });
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
      selectConfirmationRedesignFlagsMock.mockReturnValue({
        staking_confirmations: true,
      } as unknown as ConfirmationRedesignRemoteFlags);

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
        screen: Routes.STAKING.STAKE_CONFIRMATION,
        params: {
          amountFiat: '750',
          amountWei: '375000000000000000',
          annualRewardRate: '50%',
          annualRewardsFiat: '375 USD',
          annualRewardsToken: '0.1875 ETH',
          chainId: CHAIN_IDS.MAINNET,
        },
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
          params: {
            action: 'ALLOWANCE_INCREASE',
            amountFiat: '25',
            amountTokenMinimalUnit: '25000000',
            annualRewardRate: '2.5%',
            annualRewardsFiat: '0.63 USD',
            annualRewardsToken: '0.625 USDC',
            lendingContractAddress:
              '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
            lendingProtocol: 'AAVE v3',
            token: {
              ...MOCK_USDC_MAINNET_ASSET,
            },
            allowanceMinimalTokenUnit: '0',
          },
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
          params: {
            action: 'DEPOSIT',
            amountFiat: '25',
            amountTokenMinimalUnit: '25000000',
            annualRewardRate: '2.5%',
            annualRewardsFiat: '0.63 USD',
            annualRewardsToken: '0.625 USDC',
            lendingContractAddress:
              '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
            lendingProtocol: 'AAVE v3',
            token: {
              ...MOCK_USDC_MAINNET_ASSET,
            },
            allowanceMinimalTokenUnit: '25000000',
          },
        });
      });
    });

    it('navigates to redesigned lending deposit confirmation', async () => {
      // Enable stablecoin lending feature flag
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      // Mock the function to return true for this test
      (
        getIsRedesignedStablecoinLendingScreenEnabled as jest.Mock
      ).mockReturnValue(true);

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
            disable7702: true,
            disableHook: true,
            disableSequential: false,
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
    it('displays "deposit" for all assets', () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);

      render(EarnInputView, {
        params: {
          ...baseProps.route.params,
          token: MOCK_USDC_MAINNET_ASSET,
        },
        key: Routes.STAKING.STAKE,
        name: 'params',
      });

      expect(mockGetStakingNavbar).toHaveBeenCalledWith(
        'Deposit',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
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
            network: 'Ethereum Mainnet',
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
              network: 'Ethereum Mainnet',
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
            network: 'Ethereum Mainnet',
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
            network: 'Ethereum Mainnet',
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
              network: 'Ethereum Mainnet',
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            }),
          }),
        );
      });
    });
  });
});

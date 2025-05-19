import { BNToHex } from '@metamask/controller-utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import BN4 from 'bnjs4';
import { Contract } from 'ethers';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { RootState } from '../../../../../reducers';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
// eslint-disable-next-line import/no-namespace
import * as tempLendingUtils from '../../utils/tempLending';
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
import * as useStakingGasFee from '../../../Stake/hooks/useStakingGasFee';
import {
  EARN_INPUT_VIEW_ACTIONS,
  EarnInputViewProps,
} from './EarnInputView.types';
import { Stake } from '../../../Stake/sdk/stakeSdkProvider';
import {
  createMockToken,
  getCreateMockTokenOptions,
} from '../../../Stake/testUtils';
import { TOKENS_WITH_DEFAULT_OPTIONS } from '../../../Stake/testUtils/testUtils.types';
import EarnInputView from './EarnInputView';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';

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
  connectSignerOrProvider: jest.fn(),
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

jest.mock('../../../Stake/hooks/useStakeContext.ts', () => ({
  useStakeContext: jest.fn(() => {
    const stakeContext: Stake = {
      setSdkType: jest.fn(),
      stakingContract: mockPooledStakingContractService,
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

jest.mock('../../../Stake/hooks/useStakingGasFee', () => ({
  __esModule: true,
  default: () => ({
    estimatedGasFeeWei: mockGasFeeBN,
    isLoadingStakingGasFee: false,
    isStakingGasFeeError: false,
    refreshGasValues: jest.fn(),
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
    annualRewardRateDecimal: 0.02522049624725908,
  }),
}));

jest.mock('../../../Stake/hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: jest.fn(),
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
            [MOCK_USDC_MAINNET_ASSET.address]: { price: 0.0005 },
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

  const baseProps: EarnInputViewProps = {
    route: {
      params: {
        action: EARN_INPUT_VIEW_ACTIONS.STAKE,
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

      const { getByText, getAllByText } = render(EarnInputView, {
        params: {
          ...baseProps.route.params,
          action: EARN_INPUT_VIEW_ACTIONS.LEND,
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
      expect(getByText('4.5% APR')).toBeDefined();
      expect(getByText('1 USDC')).toBeDefined();

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

      fireEvent.press(getByText('2'));

      expect(getByText('0.05044 ETH')).toBeTruthy();
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
      });
    });
  });

  describe('navigates to ', () => {
    it('gas impact modal when gas cost is 30% or more of deposit amount', async () => {
      const mockUseStakingGasFee = jest.spyOn(useStakingGasFee, 'default');
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
        estimatedGasFeeWei: toWei('0.25'),
        isLoadingStakingGasFee: false,
        isStakingGasFeeError: false,
        refreshGasValues: jest.fn(),
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
          annualRewardRate: '2.5%',
          annualRewardsToken: '0.00946 ETH',
          annualRewardsFiat: '18.92 USD',
          estimatedGasFee: '0.25',
          estimatedGasFeePercentage: '66%',
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
        screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_DEPOSIT,
      });

      expect(attemptDepositTransactionMock).toHaveBeenCalledTimes(1);
      expect(attemptDepositTransactionMock).toHaveBeenCalledWith(
        '375000000000000000',
        MOCK_ADDRESS_2,
        undefined,
        true,
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
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

      fireEvent.press(getByText('25%'));

      fireEvent.press(getByText(strings('stake.review')));

      jest.useRealTimers();

      await new Promise(process.nextTick);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenLastCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE_CONFIRMATION,
        params: {
          amountFiat: '750',
          amountWei: '375000000000000000',
          annualRewardRate: '2.5%',
          annualRewardsToken: '0.00946 ETH',
          annualRewardsFiat: '18.92 USD',
        },
      });
    });

    it('earn lending deposit view', async () => {
      selectStablecoinLendingEnabledFlagMock.mockReturnValue(true);
      const getErc20SpendingLimitSpy = jest
        .spyOn(tempLendingUtils, 'getErc20SpendingLimit')
        .mockResolvedValue('0');

      const routeParamsWithUSDC: EarnInputViewProps['route'] = {
        params: {
          action: EARN_INPUT_VIEW_ACTIONS.STAKE,
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
            amountFiat: '0.25',
            amountTokenMinimalUnit: '250000',
            annualRewardRate: '2.5%',
            annualRewardsFiat: '0.01 USD',
            annualRewardsToken: '0.00631 ETH',
            lendingContractAddress:
              '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
            lendingProtocol: 'AAVE v3',
            token: {
              address: '0x123232',
              aggregators: expect.any(Array),
              balance: '',
              balanceFiat: '$33.23',
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
            },
          },
        });
      });
    });
  });
});

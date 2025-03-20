import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import { Contract } from 'ethers';
import StakeInputView from './StakeInputView';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { Stake } from '../../sdk/stakeSdkProvider';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_GET_VAULT_RESPONSE,
} from '../../__mocks__/mockData';
import { toWei } from '../../../../../util/number';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import/no-namespace
import * as useStakingGasFee from '../../hooks/useStakingGasFee';
import {
  STAKE_INPUT_VIEW_ACTIONS,
  StakeInputViewProps,
} from './StakeInputView.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../../../reducers';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_VAULT_APY_AVERAGES } from '../../components/PoolStakingLearnMoreModal/mockVaultRewards';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import {
  selectConfirmationRedesignFlags,
  type ConfirmationRedesignRemoteFlags,
} from '../../../../../selectors/featureFlagController';
import { flushPromises } from '../../../../../util/test/utils';
import usePoolStakedDeposit from '../../hooks/usePoolStakedDeposit';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import useMetrics from '../../../../hooks/useMetrics/useMetrics';
import { EVENT_PROVIDERS } from '../../constants/events';

const MOCK_SELECTED_INTERNAL_ACCOUNT = {
  address: '0x123',
} as InternalAccount;

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();

jest.mock('../../../../hooks/useMetrics/useMetrics');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => selector()),
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

// Mock necessary modules and hooks
jest.mock('../../../../../selectors/currencyRateController.ts', () => ({
  selectConversionRate: jest.fn(() => 2000),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

// Add mock for multichain selectors
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

jest.mock('../../../../../selectors/featureFlagController', () => ({
  selectConfirmationRedesignFlags: jest.fn(),
}));

const mockBalanceBN = toWei('1.5'); // 1.5 ETH

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

jest.mock('../../hooks/useStakeContext.ts', () => ({
  useStakeContext: jest.fn(() => {
    const stakeContext: Stake = {
      setSdkType: jest.fn(),
      stakingContract: mockPooledStakingContractService,
    };
    return stakeContext;
  }),
}));

jest.mock('../../hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    balanceETH: '1.5',
    balanceWei: mockBalanceBN,
    balanceFiatNumber: '3000',
  }),
}));

const mockGasFee = toWei('0.0001');

jest.mock('../../hooks/useStakingGasFee', () => ({
  __esModule: true,
  default: () => ({
    estimatedGasFeeWei: mockGasFee,
    isLoadingStakingGasFee: false,
    isStakingGasFeeError: false,
    refreshGasValues: jest.fn(),
  }),
}));

// Mock hooks
jest.mock('../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest.fn(),
  }),
}));

jest.mock('../../hooks/useVaultApyAverages', () => ({
  __esModule: true,
  default: () => ({
    vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
    isLoadingVaultApyAverages: false,
    refreshVaultApyAverages: jest.fn(),
  }),
}));

const mockVaultMetadata = MOCK_GET_VAULT_RESPONSE;

jest.mock('../../hooks/useVaultMetadata', () => ({
  __esModule: true,
  default: () => ({
    vaultMetadata: mockVaultMetadata,
    isLoadingVaultMetadata: false,
    error: null,
    annualRewardRate: '2.5%',
    annualRewardRateDecimal: 0.02522049624725908,
  }),
}));

jest.mock('../../hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('StakeInputView', () => {
  const usePoolStakedDepositMock = jest.mocked(usePoolStakedDeposit);
  const selectConfirmationRedesignFlagsMock = jest.mocked(
    selectConfirmationRedesignFlags,
  );
  const selectSelectedInternalAccountMock = jest.mocked(
    selectSelectedInternalAccount,
  );
  const baseProps: StakeInputViewProps = {
    route: {
      params: {
        action: STAKE_INPUT_VIEW_ACTIONS.STAKE,
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
    selectSelectedInternalAccountMock.mockImplementation(
      () => MOCK_SELECTED_INTERNAL_ACCOUNT,
    );
    selectConfirmationRedesignFlagsMock.mockImplementation(
      () =>
        ({
          staking_transactions: false,
        } as ConfirmationRedesignRemoteFlags),
    );
    usePoolStakedDepositMock.mockReturnValue({
      attemptDepositTransaction: jest.fn(),
    });
    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);
  });

  const renderComponent = () =>
    renderWithProvider(<StakeInputView {...baseProps} />, {
      state: mockInitialState,
    });

  it('render matches snapshot', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  describe('when values are entered in the keypad', () => {
    it('updates ETH and fiat values', () => {
      const { toJSON, getByText } = renderComponent();

      expect(toJSON()).toMatchSnapshot();

      fireEvent.press(getByText('2'));

      expect(getByText('4000 USD')).toBeTruthy();
    });
  });

  describe('currency toggle functionality', () => {
    it('switches between ETH and fiat correctly', () => {
      const { getByText } = renderComponent();

      expect(getByText('ETH')).toBeTruthy();
      fireEvent.press(getByText('0 USD'));

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

    describe('navigates to ', () => {
      it('gas impact modal when gas cost is 30% or more of deposit amount', async () => {
        jest.spyOn(useStakingGasFee, 'default').mockReturnValue({
          estimatedGasFeeWei: toWei('0.25'),
          isLoadingStakingGasFee: false,
          isStakingGasFeeError: false,
          refreshGasValues: jest.fn(),
        });

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
            annualRewardsETH: '0.00946 ETH',
            annualRewardsFiat: '18.92 USD',
            estimatedGasFee: '0.25',
            estimatedGasFeePercentage: '66%',
          },
        });
      });

      it('redesigned stake deposit confirmation view', async () => {
        const attemptDepositTransactionMock = jest.fn().mockResolvedValue({});
        selectConfirmationRedesignFlagsMock.mockReturnValue({
          staking_transactions: true,
        } as ConfirmationRedesignRemoteFlags);

        usePoolStakedDepositMock.mockReturnValue({
          attemptDepositTransaction: attemptDepositTransactionMock,
        });

        const { getByText } = renderComponent();

        fireEvent.press(getByText('25%'));

        fireEvent.press(getByText(strings('stake.review')));

        // Wait for approval to be processed
        await flushPromises();

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenLastCalledWith('StakeScreens', {
          screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_DEPOSIT,
        });

        expect(attemptDepositTransactionMock).toHaveBeenCalledTimes(1);
        expect(attemptDepositTransactionMock).toHaveBeenCalledWith(
          '375000000000000000',
          MOCK_SELECTED_INTERNAL_ACCOUNT.address,
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
        const { getByText } = renderComponent();

        fireEvent.press(getByText('25%'));

        fireEvent.press(getByText(strings('stake.review')));

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenLastCalledWith('StakeScreens', {
          screen: Routes.STAKING.STAKE_CONFIRMATION,
          params: {
            amountFiat: '750',
            amountWei: '375000000000000000',
            annualRewardRate: '2.5%',
            annualRewardsETH: '0.00946 ETH',
            annualRewardsFiat: '18.92 USD',
          },
        });
      });
    });
  });
});

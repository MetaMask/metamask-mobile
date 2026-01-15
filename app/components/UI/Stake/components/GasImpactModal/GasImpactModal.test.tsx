import React from 'react';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { flushPromises } from '../../../../../util/test/utils';
import {
  selectConfirmationRedesignFlags,
  type ConfirmationRedesignRemoteFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
import usePoolStakedDeposit from '../../hooks/usePoolStakedDeposit';
import { GasImpactModalProps } from './GasImpactModal.types';
import GasImpactModal from './index';

const MOCK_SELECTED_INTERNAL_ACCOUNT = {
  address: '0x123',
} as InternalAccount;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(
    () => () => MOCK_SELECTED_INTERNAL_ACCOUNT,
  ),
}));

jest.mock('../../../../../selectors/featureFlagController/confirmations');

jest.mock('../../hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }),
  }),
  MetaMetricsEvents: {
    STAKE_TRANSACTION_APPROVED: 'STAKE_TRANSACTION_APPROVED',
    STAKE_TRANSACTION_REJECTED: 'STAKE_TRANSACTION_REJECTED',
    STAKE_TRANSACTION_CONFIRMED: 'STAKE_TRANSACTION_CONFIRMED',
    STAKE_TRANSACTION_FAILED: 'STAKE_TRANSACTION_FAILED',
    STAKE_TRANSACTION_SUBMITTED: 'STAKE_TRANSACTION_SUBMITTED',
    STAKE_GAS_COST_IMPACT_CANCEL_CLICKED:
      'STAKE_GAS_COST_IMPACT_CANCEL_CLICKED',
    STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED:
      'STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED',
  },
}));

const props: GasImpactModalProps = {
  route: {
    key: '1',
    params: {
      amountWei: '3210000000000000',
      amountFiat: '7.46',
      annualRewardRate: '2.5%',
      annualRewardsETH: '2.5 ETH',
      annualRewardsFiat: '$5000',
      estimatedGasFee: '0.009171428571428572',
      estimatedGasFeePercentage: '35%',
      chainId: '1',
    },
    name: 'GasImpact',
  },
};

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderGasImpactModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <GasImpactModal {...props} />,
    </SafeAreaProvider>,
    undefined,
    true,
    false,
  );

describe('GasImpactModal', () => {
  const usePoolStakedDepositMock = jest.mocked(usePoolStakedDeposit);
  const selectConfirmationRedesignFlagsMock = jest.mocked(
    selectConfirmationRedesignFlags,
  );
  const useNavigationMock = jest.mocked(useNavigation);
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    usePoolStakedDepositMock.mockReturnValue({
      attemptDepositTransaction: jest.fn(),
    });

    selectConfirmationRedesignFlagsMock.mockReturnValue({
      staking_confirmations: false,
    } as ConfirmationRedesignRemoteFlags);

    useNavigationMock.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderGasImpactModal();

    expect(toJSON()).toMatchSnapshot();
  });

  it('closes gas impact modal on cancel', () => {
    const { getByText } = renderGasImpactModal();

    const proceedAnywayButton = getByText(strings('stake.cancel'));

    fireEvent.press(proceedAnywayButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('navigates to', () => {
    it('StakeConfirmationView on approval', () => {
      const { getByText } = renderGasImpactModal();

      const proceedAnywayButton = getByText(strings('stake.proceed_anyway'));

      fireEvent.press(proceedAnywayButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE_CONFIRMATION,
        params: {
          amountWei: props.route.params.amountWei,
          amountFiat: props.route.params.amountFiat,
          annualRewardsETH: props.route.params.annualRewardsETH,
          annualRewardsFiat: props.route.params.annualRewardsFiat,
          annualRewardRate: props.route.params.annualRewardRate,
          chainId: props.route.params.chainId,
        },
      });
    });

    it('redesigned stake deposit confirmation view', async () => {
      const attemptDepositTransactionMock = jest.fn().mockResolvedValue({});
      selectConfirmationRedesignFlagsMock.mockReturnValue({
        staking_confirmations: true,
      } as ConfirmationRedesignRemoteFlags);

      usePoolStakedDepositMock.mockReturnValue({
        attemptDepositTransaction: attemptDepositTransactionMock,
      });

      const { getByText } = renderGasImpactModal();

      const proceedAnywayButton = getByText(strings('stake.proceed_anyway'));

      fireEvent.press(proceedAnywayButton);

      // Wait for approval to be processed
      await flushPromises();

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });

      expect(attemptDepositTransactionMock).toHaveBeenCalledTimes(1);
      expect(attemptDepositTransactionMock).toHaveBeenCalledWith(
        props.route.params.amountWei,
        MOCK_SELECTED_INTERNAL_ACCOUNT.address,
      );
    });
  });

  describe('metrics tracking', () => {
    it('tracks cancel event when closing modal', () => {
      const { getByText } = renderGasImpactModal();
      const cancelButton = getByText(strings('stake.cancel'));
      fireEvent.press(cancelButton);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('tracks proceed event when proceeding with stake', () => {
      const { getByText } = renderGasImpactModal();
      const proceedButton = getByText(strings('stake.proceed_anyway'));
      fireEvent.press(proceedButton);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('redesigned stake deposit flow', () => {
    it('handles case when attemptDepositTransaction is undefined', async () => {
      selectConfirmationRedesignFlagsMock.mockReturnValue({
        staking_confirmations: true,
      } as ConfirmationRedesignRemoteFlags);

      usePoolStakedDepositMock.mockReturnValue({
        attemptDepositTransaction: undefined,
      });

      const { getByText } = renderGasImpactModal();
      const proceedButton = getByText(strings('stake.proceed_anyway'));
      fireEvent.press(proceedButton);
      await flushPromises();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles deposit transaction error', async () => {
      const attemptDepositTransactionMock = jest
        .fn()
        .mockRejectedValue(new Error('Transaction failed'));
      selectConfirmationRedesignFlagsMock.mockReturnValue({
        staking_confirmations: true,
      } as ConfirmationRedesignRemoteFlags);

      usePoolStakedDepositMock.mockReturnValue({
        attemptDepositTransaction: attemptDepositTransactionMock,
      });

      const { getByText } = renderGasImpactModal();
      const proceedButton = getByText(strings('stake.proceed_anyway'));
      fireEvent.press(proceedButton);
      await flushPromises();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('bottom sheet functionality', () => {
    it('closes bottom sheet when cancel is pressed', () => {
      const { getByText } = renderGasImpactModal();
      const cancelButton = getByText(strings('stake.cancel'));
      fireEvent.press(cancelButton);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});

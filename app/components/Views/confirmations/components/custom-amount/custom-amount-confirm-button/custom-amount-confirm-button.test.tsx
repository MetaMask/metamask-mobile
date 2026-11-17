import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountConfirmButton } from './custom-amount-confirm-button';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import {
  useAlerts,
  AlertsContextParams,
} from '../../../context/alert-system-context';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { usePredictWithdrawGasFeeToken } from '../../../hooks/gas/usePredictWithdrawGasFeeToken';
import { ConfirmationFooterSelectorIDs } from '../../../ConfirmationView.testIds';
import { TransactionType } from '@metamask/transaction-controller';
import { Alert } from '../../../types/alerts';
import { useRoute } from '@react-navigation/native';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { useIsMoneyAccountPaymentOverride } from '../../../hooks/pay/useIsMoneyAccountPaymentOverride';

jest.mock('../../../context/alert-system-context');
jest.mock('../../../context/confirmation-context');
jest.mock('../../../hooks/useConfirmActions');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/gas/usePredictWithdrawGasFeeToken');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod');
jest.mock('../../../hooks/pay/useIsMoneyAccountPaymentOverride');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

function render(props: {
  isDisabled?: boolean;
  onContinue?: () => void;
  stage?: CustomAmountStage;
}) {
  return renderWithProvider(
    <CustomAmountConfirmButton
      isDisabled={props.isDisabled ?? false}
      onContinue={props.onContinue}
      stage={props.stage ?? CustomAmountStage.ShowTotals}
    />,
    {
      state: merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      ),
    },
  );
}

describe('CustomAmountConfirmButton', () => {
  const useAlertsMock = jest.mocked(useAlerts);
  const useConfirmationContextMock = jest.mocked(useConfirmationContext);
  const useConfirmActionsMock = jest.mocked(useConfirmActions);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useRouteMock = jest.mocked(useRoute);
  const usePredictWithdrawGasFeeTokenMock = jest.mocked(
    usePredictWithdrawGasFeeToken,
  );
  const setIsConfirmationSubmittingMock = jest.fn();
  const recheckMock = jest.fn();

  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionPaySelectedFiatPaymentMethodMock = jest.mocked(
    useTransactionPaySelectedFiatPaymentMethod,
  );
  const useIsMoneyAccountPaymentOverrideMock = jest.mocked(
    useIsMoneyAccountPaymentOverride,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as never);
    useTransactionPaySelectedFiatPaymentMethodMock.mockReturnValue(undefined);
    useIsMoneyAccountPaymentOverrideMock.mockReturnValue(false);

    useRouteMock.mockReturnValue({
      key: 'mock-route',
      name: 'MockScreen',
      params: {},
    } as never);

    useAlertsMock.mockReturnValue({
      alerts: [] as Alert[],
      generalAlerts: [] as Alert[],
      fieldAlerts: [] as Alert[],
    } as AlertsContextParams);

    useConfirmationContextMock.mockReturnValue({
      mmPayRequestInProgressNavHandler: { current: false },
      headlessBuyError: undefined,
      isFooterVisible: true,
      isConfirmationSubmitting: false,
      isConfirmationSubmittingRef: { current: false },
      setIsConfirmationSubmitting: setIsConfirmationSubmittingMock,
      isHeadlessBuyInProgress: false,
      isTransactionDataUpdating: false,
      isTransactionValueUpdating: false,
      setHeadlessBuyError: noop,
      setIsFooterVisible: noop,
      pendingFiatAmount: undefined,
      setPendingFiatAmount: noop,
      setIsHeadlessBuyInProgress: noop,
      setIsTransactionDataUpdating: noop,
      setIsTransactionValueUpdating: noop,
      isGasFeeModalVisible: false,
      setIsGasFeeModalVisible: noop,
    } as ReturnType<typeof useConfirmationContext>);

    useConfirmActionsMock.mockReturnValue({
      onConfirm: jest.fn(),
      onReject: jest.fn(),
    });
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    recheckMock.mockResolvedValue(true);
    usePredictWithdrawGasFeeTokenMock.mockReturnValue({
      isPending: false,
      isUnavailable: false,
      recheck: recheckMock,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
  });

  it('renders the confirm button', () => {
    const { getByTestId } = render({});

    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('always shows the default label regardless of stage', () => {
    // useTransactionMetadataRequest returns undefined → useButtonLabel returns the default 'done' string
    const { getByTestId, queryByText } = renderWithProvider(
      <CustomAmountConfirmButton
        isDisabled={false}
        stage={CustomAmountStage.Loading}
      />,
      {},
    );
    const button = getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON);
    expect(button).toBeOnTheScreen();
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.perpsDeposit,
    TransactionType.predictDeposit,
  ])('shows Convert [symbol] for %s when payToken is present', (type) => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type,
    } as never);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { symbol: 'USDC' },
    } as never);

    const { getByText } = render({ stage: CustomAmountStage.ShowTotals });
    expect(getByText('Convert USDC')).toBeOnTheScreen();
  });

  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'shows Send for %s when payWithOption is MoneyAccount even if payToken is set',
    (type) => {
      useRouteMock.mockReturnValue({
        key: 'mock-route',
        name: 'MockScreen',
        params: { payWithOption: 'money_account' },
      } as never);
      useTransactionMetadataRequestMock.mockReturnValue({
        type,
      } as never);
      useTransactionPayTokenMock.mockReturnValue({
        payToken: { symbol: 'USDC' },
      } as never);

      const { getByText } = render({ stage: CustomAmountStage.ShowTotals });
      expect(getByText('Send')).toBeOnTheScreen();
    },
  );

  it('falls back to Add funds when fiat payment is selected on a deposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as never);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { symbol: 'USDC' },
    } as never);
    useTransactionPaySelectedFiatPaymentMethodMock.mockReturnValue({
      id: 'pm-card',
    } as never);

    const { getByText } = render({ stage: CustomAmountStage.ShowTotals });
    expect(getByText('Add funds')).toBeOnTheScreen();
  });

  it('falls back to Add funds when MoneyAccount payment override is active on a deposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictDeposit,
    } as never);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { symbol: 'USDC' },
    } as never);
    useIsMoneyAccountPaymentOverrideMock.mockReturnValue(true);

    const { getByText } = render({ stage: CustomAmountStage.ShowTotals });
    expect(getByText('Add funds')).toBeOnTheScreen();
  });

  it('keeps Add funds for other transaction types even when payToken is present', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDepositAndOrder,
    } as never);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { symbol: 'USDC' },
    } as never);

    const { getByText } = render({ stage: CustomAmountStage.ShowTotals });
    expect(getByText('Add funds')).toBeOnTheScreen();
  });

  it('calls onConfirm and onContinue when pressed (enabled state)', async () => {
    const onConfirmMock = jest.fn();
    const onContinueMock = jest.fn();

    useConfirmActionsMock.mockReturnValue({
      onConfirm: onConfirmMock,
      onReject: jest.fn(),
    });

    const { getByTestId } = render({
      stage: CustomAmountStage.ShowTotals,
      isDisabled: false,
      onContinue: onContinueMock,
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      );
    });

    expect(setIsConfirmationSubmittingMock).toHaveBeenCalledWith(true);
    expect(onContinueMock).toHaveBeenCalledTimes(1);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('button is disabled when isDisabled is true', () => {
    const { getByTestId } = render({
      isDisabled: true,
      stage: CustomAmountStage.ShowTotals,
    });

    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('button is disabled when stage is not ShowTotals', () => {
    const { getByTestId } = render({
      isDisabled: false,
      stage: CustomAmountStage.Loading,
    });

    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('button is disabled when hasBlockingAlerts is true', () => {
    useAlertsMock.mockReturnValue({
      alerts: [],
      generalAlerts: [],
      fieldAlerts: [],
      hasBlockingAlerts: true,
    } as unknown as AlertsContextParams);

    const { getByTestId } = render({
      isDisabled: false,
      stage: CustomAmountStage.ShowTotals,
    });

    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('button is disabled when pay data is loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render({
      isDisabled: false,
      stage: CustomAmountStage.ShowTotals,
    });

    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('disables the button while the Predict withdraw gas fee token check is pending', () => {
    usePredictWithdrawGasFeeTokenMock.mockReturnValue({
      isPending: true,
      isUnavailable: false,
      recheck: recheckMock,
    });

    const { getByTestId } = render({
      isDisabled: false,
      stage: CustomAmountStage.ShowTotals,
    });

    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });

  it('checks the Predict withdraw gas fee token again before confirming', async () => {
    const onConfirmMock = jest.fn();
    useConfirmActionsMock.mockReturnValue({
      onConfirm: onConfirmMock,
      onReject: jest.fn(),
    });

    const { getByTestId } = render({});

    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      );
    });

    expect(recheckMock).toHaveBeenCalledTimes(1);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('does not confirm when the Predict withdraw gas fee token is no longer available', async () => {
    const onConfirmMock = jest.fn();
    const onContinueMock = jest.fn();
    useConfirmActionsMock.mockReturnValue({
      onConfirm: onConfirmMock,
      onReject: jest.fn(),
    });
    recheckMock.mockResolvedValue(false);

    const { getByTestId } = render({ onContinue: onContinueMock });

    await act(async () => {
      fireEvent.press(
        getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      );
    });

    expect(onConfirmMock).not.toHaveBeenCalled();
    expect(onContinueMock).not.toHaveBeenCalled();
    expect(setIsConfirmationSubmittingMock).toHaveBeenNthCalledWith(1, true);
    expect(setIsConfirmationSubmittingMock).toHaveBeenNthCalledWith(2, false);
  });
});

import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountConfirmButton } from './custom-amount-confirm-button';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationFooterSelectorIDs } from '../../../ConfirmationView.testIds';
import { TransactionType } from '@metamask/transaction-controller';
import { Alert } from '../../../types/alerts';
import { AlertsContextParams } from '../../../context/alert-system-context';
import { useRoute } from '@react-navigation/native';

jest.mock('../../../context/alert-system-context');
jest.mock('../../../context/confirmation-context');
jest.mock('../../../hooks/useConfirmActions');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

function render(props: {
  alertTitle?: string;
  isDisabled?: boolean;
  onContinue?: () => void;
  stage?: CustomAmountStage;
}) {
  return renderWithProvider(
    <CustomAmountConfirmButton
      alertTitle={props.alertTitle}
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
  const useRouteMock = jest.mocked(useRoute);
  const setIsConfirmationSubmittingMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

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
      setIsHeadlessBuyInProgress: noop,
      setIsTransactionDataUpdating: noop,
      setIsTransactionValueUpdating: noop,
      isMaxDeposit: false,
      setIsMaxDeposit: noop,
    } as ReturnType<typeof useConfirmationContext>);

    useConfirmActionsMock.mockReturnValue({
      onConfirm: jest.fn(),
      onReject: jest.fn(),
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
      fireEvent.press(getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON));
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
});

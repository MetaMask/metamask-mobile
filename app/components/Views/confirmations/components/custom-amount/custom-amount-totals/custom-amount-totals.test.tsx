import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountTotals } from './custom-amount-totals';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../rows/bridge-fee-row', () => ({
  BridgeFeeRow: () => null,
}));

jest.mock('../../rows/bridge-time-row', () => ({
  BridgeTimeRow: () => null,
}));

jest.mock('../../rows/total-row', () => {
  const { View } = jest.requireActual('react-native');
  return {
    TotalRow: () => <View testID="total-row" />,
  };
});

jest.mock('../../rows/receive-row', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ReceiveRow: () => <View testID="receive-row" />,
  };
});

function render(
  props: Partial<{
    amountFiat: string;
    canSelectWithdrawToken: boolean;
    isAddMusdIntent: boolean;
    isAwaitingPrefillResult: boolean;
    isLoading: boolean;
    showPaymentDetails: boolean;
  }> = {},
) {
  return renderWithProvider(
    <CustomAmountTotals
      amountFiat={props.amountFiat ?? '100'}
      canSelectWithdrawToken={props.canSelectWithdrawToken ?? false}
      isAddMusdIntent={props.isAddMusdIntent ?? false}
      isAwaitingPrefillResult={props.isAwaitingPrefillResult ?? false}
      isLoading={props.isLoading ?? false}
      showPaymentDetails={props.showPaymentDetails ?? true}
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

describe('CustomAmountTotals', () => {
  it('renders loading skeleton when isLoading', () => {
    const { getByTestId } = render({ isLoading: true });

    expect(getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
    expect(getByTestId('bridge-time-row-skeleton')).toBeOnTheScreen();
    expect(getByTestId('total-row-skeleton')).toBeOnTheScreen();
  });

  it('returns null when there are no payment details', () => {
    const { queryByTestId } = render({ showPaymentDetails: false });

    expect(queryByTestId('bridge-fee-row-skeleton')).toBeNull();
    expect(queryByTestId('bridge-time-row-skeleton')).toBeNull();
    expect(queryByTestId('total-row-skeleton')).toBeNull();
  });

  it('renders loading skeleton when awaiting prefill result', () => {
    const { getByTestId } = render({
      isAwaitingPrefillResult: true,
      showPaymentDetails: false,
    });

    expect(getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
  });

  it('renders without skeletons when payment details are shown', () => {
    const { queryByTestId } = render({ showPaymentDetails: true });

    expect(queryByTestId('bridge-fee-row-skeleton')).toBeNull();
    expect(queryByTestId('total-row-skeleton')).toBeNull();
  });

  it('renders ReceiveRow when canSelectWithdrawToken is true', () => {
    const { getByTestId, queryByTestId } = render({
      canSelectWithdrawToken: true,
      showPaymentDetails: true,
    });

    expect(getByTestId('receive-row')).toBeOnTheScreen();
    expect(queryByTestId('total-row')).toBeNull();
  });

  it('renders TotalRow when canSelectWithdrawToken is false', () => {
    const { getByTestId, queryByTestId } = render({
      canSelectWithdrawToken: false,
      showPaymentDetails: true,
    });

    expect(getByTestId('total-row')).toBeOnTheScreen();
    expect(queryByTestId('receive-row')).toBeNull();
  });
});

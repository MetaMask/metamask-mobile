import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountTotals } from './custom-amount-totals';
import { CustomAmountStage } from '../../../hooks/custom-amount/useCustomAmountStage';
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

function render(props: { stage: CustomAmountStage }) {
  return renderWithProvider(<CustomAmountTotals stage={props.stage} />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('CustomAmountTotals', () => {
  it('renders loading skeleton when stage is Loading', () => {
    const { getByTestId } = render({ stage: CustomAmountStage.Loading });

    expect(getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
    expect(getByTestId('bridge-time-row-skeleton')).toBeOnTheScreen();
    expect(getByTestId('total-row-skeleton')).toBeOnTheScreen();
  });

  it('returns null when stage is NoQuote', () => {
    const { queryByTestId } = render({ stage: CustomAmountStage.NoQuote });

    expect(queryByTestId('bridge-fee-row-skeleton')).toBeNull();
    expect(queryByTestId('bridge-time-row-skeleton')).toBeNull();
    expect(queryByTestId('total-row-skeleton')).toBeNull();
  });

  it('renders the total row when stage is ShowTotals', () => {
    const { getByTestId, queryByTestId } = render({
      stage: CustomAmountStage.ShowTotals,
    });

    expect(getByTestId('total-row')).toBeOnTheScreen();
    expect(queryByTestId('bridge-fee-row-skeleton')).toBeNull();
    expect(queryByTestId('total-row-skeleton')).toBeNull();
  });
});

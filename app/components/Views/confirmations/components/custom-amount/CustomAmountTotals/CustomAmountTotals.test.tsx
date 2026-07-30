import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountTotals } from './index';
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

jest.mock('../../rows/total-row', () => ({
  TotalRow: () => null,
}));

jest.mock('../../rows/receive-row', () => ({
  ReceiveRow: () => null,
}));

function render(props: {
  amountFiat?: string;
  canSelectWithdrawToken?: boolean;
  stage: CustomAmountStage;
}) {
  return renderWithProvider(
    <CustomAmountTotals
      amountFiat={props.amountFiat ?? '100'}
      canSelectWithdrawToken={props.canSelectWithdrawToken ?? false}
      stage={props.stage}
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

  it('renders without skeletons when stage is ShowTotals', () => {
    const { queryByTestId } = render({ stage: CustomAmountStage.ShowTotals });

    expect(queryByTestId('bridge-fee-row-skeleton')).toBeNull();
    expect(queryByTestId('total-row-skeleton')).toBeNull();
  });

  it('renders without skeletons when canSelectWithdrawToken is true and stage is ShowTotals', () => {
    const { queryByTestId } = render({
      stage: CustomAmountStage.ShowTotals,
      canSelectWithdrawToken: true,
    });

    expect(queryByTestId('bridge-fee-row-skeleton')).toBeNull();
    expect(queryByTestId('total-row-skeleton')).toBeNull();
  });

  it('renders without skeletons when canSelectWithdrawToken is false and stage is ShowTotals', () => {
    const { queryByTestId } = render({
      stage: CustomAmountStage.ShowTotals,
      canSelectWithdrawToken: false,
    });

    expect(queryByTestId('bridge-fee-row-skeleton')).toBeNull();
    expect(queryByTestId('total-row-skeleton')).toBeNull();
  });
});

import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TokenAmountNative } from './token-amount-native';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../hooks/useTokenAmount');

function render() {
  return renderWithProvider(<TokenAmountNative />, {
    state: merge(
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

const NATIVE_VALUE_MOCK = '123.123456';

describe('TokenAmountNative', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      amountNative: NATIVE_VALUE_MOCK,
    } as unknown as ReturnType<typeof useTokenAmount>);
  });

  it('renders native value', () => {
    const { getByText } = render();
    expect(getByText(NATIVE_VALUE_MOCK, { exact: false })).toBeDefined();
  });

  it('renders ticker', () => {
    const { getByText } = render();
    expect(getByText('ETH', { exact: false })).toBeDefined();
  });
});

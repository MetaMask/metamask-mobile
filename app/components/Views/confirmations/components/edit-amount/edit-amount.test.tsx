import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { EditAmount, EditAmountProps } from './edit-amount';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useTokenAsset } from '../../hooks/useTokenAsset';
import { TokenI } from '../../../../UI/Tokens/types';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/useTokenAsset');

const state = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
);

function render(props: EditAmountProps = {}) {
  return renderWithProvider(<EditAmount {...props} />, { state });
}

describe('EditAmount', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const useTokenAssetMock = jest.mocked(useTokenAsset);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      amountPrecise: '1.23',
      amount: '1.23',
      isNative: false,
      fiat: '1.23 USD',
      usdValue: '1.23',
    });

    useTokenAssetMock.mockReturnValue({
      asset: {
        decimals: 18,
      } as TokenI,
      displayName: 'Test Token',
    });
  });

  it('renders amount from current transaction data', () => {
    const { getByTestId } = render();
    expect(getByTestId('edit-amount-input')).toHaveProp('value', '1.23');
  });

  it('renders prefix if specified', () => {
    const { getByTestId } = render({ prefix: 'test-' });
    expect(getByTestId('edit-amount-input')).toHaveProp('value', 'test-1.23');
  });
});

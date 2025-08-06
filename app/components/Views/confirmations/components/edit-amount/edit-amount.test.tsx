import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { EditAmount, EditAmountProps } from './edit-amount';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useTokenAsset } from '../../hooks/useTokenAsset';
import { TokenI } from '../../../../UI/Tokens/types';
import { act, fireEvent } from '@testing-library/react-native';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/useTokenAsset');

const VALUE_MOCK = '1.23';
const VALUE_2_MOCK = '2.34';

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
  const updateTokenAmountMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      amountPrecise: VALUE_MOCK,
      updateTokenAmount: updateTokenAmountMock,
    } as unknown as ReturnType<typeof useTokenAmount>);

    useTokenAssetMock.mockReturnValue({
      asset: {
        decimals: 18,
      } as TokenI,
      displayName: 'Test Token',
    });
  });

  it('renders amount from current transaction data', () => {
    const { getByTestId } = render();
    expect(getByTestId('edit-amount-input')).toHaveProp('value', VALUE_MOCK);
  });

  it('renders prefix if specified', () => {
    const { getByTestId } = render({ prefix: 'test-' });
    expect(getByTestId('edit-amount-input')).toHaveProp(
      'value',
      `test-${VALUE_MOCK}`,
    );
  });

  it('calls updateTokenAmount when input changes', async () => {
    const { getByTestId } = render();
    const input = getByTestId('edit-amount-input');

    await act(async () => {
      fireEvent(input, 'changeText', VALUE_2_MOCK);
    });

    expect(updateTokenAmountMock).toHaveBeenCalledWith(VALUE_2_MOCK);
  });

  it('updates amount when input changes', async () => {
    const { getByTestId } = render();
    const input = getByTestId('edit-amount-input');

    await act(async () => {
      fireEvent(input, 'changeText', VALUE_2_MOCK);
    });

    expect(getByTestId('edit-amount-input')).toHaveProp('value', VALUE_2_MOCK);
  });
});

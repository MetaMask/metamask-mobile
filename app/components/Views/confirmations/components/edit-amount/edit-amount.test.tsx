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
import {
  AlertsContextParams,
  useAlerts,
} from '../../context/alert-system-context';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/useTokenAsset');
jest.mock('../../context/alert-system-context');

const VALUE_MOCK = '1.23';

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
  const useAlertsMock = jest.mocked(useAlerts);
  const updateTokenAmountMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: VALUE_MOCK,
      updateTokenAmount: updateTokenAmountMock,
    } as unknown as ReturnType<typeof useTokenAmount>);

    useTokenAssetMock.mockReturnValue({
      asset: {
        decimals: 18,
      } as TokenI,
      displayName: 'Test Token',
    });

    useAlertsMock.mockReturnValue({
      fieldAlerts: [],
    } as unknown as AlertsContextParams);
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
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    expect(updateTokenAmountMock).toHaveBeenCalledWith(VALUE_MOCK + '5');
  });

  it('updates amount when input changes', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    expect(getByTestId('edit-amount-input')).toHaveProp(
      'value',
      VALUE_MOCK + '5',
    );
  });

  it('displays keyboard automatically when autoKeyboard is true', () => {
    const { getByTestId } = render({ autoKeyboard: true });

    expect(getByTestId('edit-amount-keyboard')).toBeDefined();
  });

  it('hides keyboard if done button pressed', async () => {
    const { queryByTestId, getByText } = render({ autoKeyboard: true });

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(queryByTestId('edit-amount-keyboard')).toBeNull();
  });
});

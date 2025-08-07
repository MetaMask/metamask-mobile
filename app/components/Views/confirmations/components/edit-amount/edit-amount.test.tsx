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
import { RowAlertKey } from '../UI/info-row/alert-row/constants';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/useTokenAsset');
jest.mock('../../context/alert-system-context');

const VALUE_MOCK = '1.23';
const VALUE_2_MOCK = '2.34';
const ALERT_MESSAGE_MOCK = 'Test Message';

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
      amountPrecise: VALUE_MOCK,
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

  it('renders alert if field is amount', () => {
    useAlertsMock.mockReturnValue({
      fieldAlerts: [
        {
          field: RowAlertKey.Amount,
          message: ALERT_MESSAGE_MOCK,
        },
      ],
    } as unknown as AlertsContextParams);

    const { getByText } = render();

    expect(getByText(ALERT_MESSAGE_MOCK)).toBeDefined();
  });

  it('does not render alert if field is not amount', () => {
    useAlertsMock.mockReturnValue({
      fieldAlerts: [
        {
          field: RowAlertKey.AccountTypeUpgrade,
          message: ALERT_MESSAGE_MOCK,
        },
      ],
    } as unknown as AlertsContextParams);

    const { queryByText } = render();

    expect(queryByText(ALERT_MESSAGE_MOCK)).toBeNull();
  });
});

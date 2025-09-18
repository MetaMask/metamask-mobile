import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { EditAmount, EditAmountProps } from './edit-amount';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { act, fireEvent } from '@testing-library/react-native';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { useTokenFiatRate } from '../../hooks/tokens/useTokenFiatRates';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/pay/useTransactionPayToken');
jest.mock('../../hooks/tokens/useTokenFiatRates');

jest.useFakeTimers();

const FIAT_RATE_MOCK = 2;

const state = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
);

function render(props: EditAmountProps = {}) {
  return renderWithProvider(<EditAmount {...props} />, { state });
}

describe('EditAmount', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokenFiatRateMock = jest.mocked(useTokenFiatRate);
  const updateTokenAmountMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      fiatUnformatted: '0',
      updateTokenAmount: updateTokenAmountMock,
    } as unknown as ReturnType<typeof useTokenAmount>);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { balanceFiat: '0' },
    } as ReturnType<typeof useTransactionPayToken>);

    useTokenFiatRateMock.mockReturnValue(FIAT_RATE_MOCK);
  });

  it('calls updateTokenAmount with token amount when done button pressed', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    await act(async () => {
      fireEvent.press(getByText('3'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('deposit-keyboard-done-button'));
    });

    await jest.runAllTimersAsync();

    expect(updateTokenAmountMock).toHaveBeenCalledWith('26.5');
  });

  it('updates amount when input changes', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    expect(getByTestId('edit-amount-input')).toHaveProp('defaultValue', '5');
  });

  it('sets amount to zero when input cleared', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('keypad-delete-button'));
    });

    expect(getByTestId('edit-amount-input')).toHaveProp('defaultValue', '0');
  });

  it('does not append to zero', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    await act(async () => {
      fireEvent.press(getByText('0'));
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    expect(getByTestId('edit-amount-input')).toHaveProp('defaultValue', '5');
  });

  it('appends zero if input starts with a decimal point', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    await act(async () => {
      fireEvent.press(getByText('.'));
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    expect(getByTestId('edit-amount-input')).toHaveProp('defaultValue', '0.5');
  });

  it('displays keyboard automatically when autoKeyboard is true', () => {
    const { getByTestId } = render({ autoKeyboard: true });

    expect(getByTestId('deposit-keyboard')).toBeDefined();
  });

  it('hides keyboard if done button pressed', async () => {
    const { queryByTestId, getByTestId, getByText } = render({
      autoKeyboard: true,
    });

    await act(async () => {
      fireEvent.press(getByText('5'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('deposit-keyboard-done-button'));
    });

    expect(queryByTestId('deposit-keyboard')).toBeNull();
  });

  it('updates token amount if percentage button pressed', async () => {
    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '0',
      updateTokenAmount: updateTokenAmountMock,
    } as unknown as ReturnType<typeof useTokenAmount>);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { tokenFiatAmount: 1200.54321 },
    } as ReturnType<typeof useTransactionPayToken>);

    const { getByTestId, getByText } = render();

    const input = getByTestId('edit-amount-input');

    await act(async () => {
      fireEvent.press(input);
    });

    await act(async () => {
      fireEvent.press(getByText('50%'));
    });

    await jest.runAllTimersAsync();

    expect(input).toHaveProp('defaultValue', '600.27');
  });

  it('does nothing if percentage button pressed with no pay token selected', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '0',
      updateTokenAmount: updateTokenAmountMock,
    } as unknown as ReturnType<typeof useTokenAmount>);

    const { getByTestId, getByText } = render();

    const input = getByTestId('edit-amount-input');

    await act(async () => {
      fireEvent.press(input);
    });

    await act(async () => {
      fireEvent.press(getByText('50%'));
    });

    expect(updateTokenAmountMock).not.toHaveBeenCalled();
  });

  it('limits decimal places to 2', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    for (const char of '5.123') {
      await act(async () => {
        fireEvent.press(getByText(char));
      });
    }

    expect(getByTestId('edit-amount-input')).toHaveProp('defaultValue', '5.12');
  });

  it('limits length to 28', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('edit-amount-input'));
    });

    for (const char of '1234567890123456789012345678') {
      await act(async () => {
        fireEvent.press(getByText(char));
      });
    }

    expect(getByTestId('edit-amount-input')).toHaveProp(
      'defaultValue',
      '123456789012345678901234567',
    );
  });

  it('renders skeleton if isLoading set', async () => {
    const { getByTestId } = render({ isLoading: true });

    expect(getByTestId('edit-amount-skeleton')).toBeDefined();
  });
});

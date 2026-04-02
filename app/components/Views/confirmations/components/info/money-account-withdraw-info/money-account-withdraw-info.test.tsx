import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MoneyAccountWithdrawInfo,
  MONEY_ACCOUNT_CURRENCY,
} from './money-account-withdraw-info';

jest.mock('../../../hooks/ui/useNavbar', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockCustomAmountInfo = jest.fn();
jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: (props: Record<string, unknown>) => {
    mockCustomAmountInfo(props);
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="custom-amount-info-wrapper">
        <Text testID="custom-amount-info">{props.currency as string}</Text>
        {props.children as React.ReactNode}
      </View>
    );
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../hooks/pay/useTransactionPayWithdraw', () => ({
  useTransactionPayWithdraw: jest.fn(() => ({
    isWithdraw: true,
    canSelectWithdrawToken: true,
  })),
}));

describe('MoneyAccountWithdrawInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders CustomAmountInfo with usd currency', () => {
    const { getByTestId } = render(<MoneyAccountWithdrawInfo />);

    expect(getByTestId('custom-amount-info')).toBeOnTheScreen();
    expect(getByTestId('custom-amount-info').props.children).toBe(
      MONEY_ACCOUNT_CURRENCY,
    );
  });

  it('sets navbar title via useNavbar', () => {
    const useNavbar = jest.requireMock('../../../hooks/ui/useNavbar').default;

    render(<MoneyAccountWithdrawInfo />);

    expect(useNavbar).toHaveBeenCalledWith(
      'confirm.title.money_account_withdraw',
    );
  });

  it('MONEY_ACCOUNT_CURRENCY is usd', () => {
    expect(MONEY_ACCOUNT_CURRENCY).toBe('usd');
  });

  it('passes disablePay based on canSelectWithdrawToken', () => {
    render(<MoneyAccountWithdrawInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.disablePay).toBe(false);
  });

  it('passes disablePay=true when canSelectWithdrawToken is false', () => {
    const { useTransactionPayWithdraw } = jest.requireMock(
      '../../../hooks/pay/useTransactionPayWithdraw',
    );
    useTransactionPayWithdraw.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: false,
    });

    render(<MoneyAccountWithdrawInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.disablePay).toBe(true);
  });
});

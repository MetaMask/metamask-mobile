import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MoneyAccountDepositInfo,
  MONEY_ACCOUNT_CURRENCY,
} from './money-account-deposit-info';

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
      <View>
        <Text testID="custom-amount-info">{props.currency as string}</Text>
        {props.children as React.ReactNode}
      </View>
    );
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('MoneyAccountDepositInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomAmountInfo.mockClear();
  });

  it('renders CustomAmountInfo with usd currency', () => {
    const { getByTestId } = render(<MoneyAccountDepositInfo />);

    expect(getByTestId('custom-amount-info')).toBeOnTheScreen();
    expect(getByTestId('custom-amount-info').props.children).toBe(
      MONEY_ACCOUNT_CURRENCY,
    );
  });

  it('sets navbar title via useNavbar', () => {
    const useNavbar = jest.requireMock('../../../hooks/ui/useNavbar').default;

    render(<MoneyAccountDepositInfo />);

    expect(useNavbar).toHaveBeenCalledWith(
      'confirm.title.money_account_deposit',
    );
  });

  it('MONEY_ACCOUNT_CURRENCY is usd', () => {
    expect(MONEY_ACCOUNT_CURRENCY).toBe('usd');
  });

  it('passes supportAccountSelection=true to CustomAmountInfo', () => {
    render(<MoneyAccountDepositInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.supportAccountSelection).toBe(true);
  });
});

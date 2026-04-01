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

jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: ({ currency }: { currency: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="custom-amount-info">{currency}</Text>;
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('MoneyAccountDepositInfo', () => {
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
});

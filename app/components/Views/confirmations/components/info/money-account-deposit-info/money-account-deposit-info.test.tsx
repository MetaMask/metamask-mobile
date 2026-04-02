import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  MoneyAccountDepositInfo,
  MONEY_ACCOUNT_CURRENCY,
} from './money-account-deposit-info';

jest.mock('../../../hooks/ui/useNavbar', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: ({
    currency,
    children,
    afterPayWith,
  }: {
    currency: string;
    children?: React.ReactNode;
    afterPayWith?: React.ReactNode;
  }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View>
        <Text testID="custom-amount-info">{currency}</Text>
        {children}
        {afterPayWith}
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

  it('renders MoneyAccountSelector for recipient account to be updated', () => {
    const { getByTestId } = render(<MoneyAccountDepositInfo />);

    expect(getByTestId('money-account-selector-input')).toBeOnTheScreen();
  });

  it('calls updateEditableParams with typed address', () => {
    const { updateEditableParams } = jest.requireMock(
      '../../../../../../util/transaction-controller',
    );
    const { getByTestId } = render(<MoneyAccountDepositInfo />);

    fireEvent.changeText(
      getByTestId('money-account-selector-input'),
      '0xTestAddress',
    );

    expect(updateEditableParams).toHaveBeenCalledWith('mock-tx-id', {
      to: '0xTestAddress',
    });
  });

  it('does not call updateEditableParams when transactionMeta has no id', () => {
    const { useTransactionMetadataRequest } = jest.requireMock(
      '../../../hooks/transactions/useTransactionMetadataRequest',
    );
    useTransactionMetadataRequest.mockReturnValueOnce(null);

    const { updateEditableParams } = jest.requireMock(
      '../../../../../../util/transaction-controller',
    );
    const { getByTestId } = render(<MoneyAccountDepositInfo />);

    fireEvent.changeText(
      getByTestId('money-account-selector-input'),
      '0xTestAddress',
    );

    expect(updateEditableParams).not.toHaveBeenCalled();
  });
});

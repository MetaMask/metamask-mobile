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

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(() => ({
    id: 'mock-tx-id',
    chainId: '0x1',
    txParams: { from: '0xFromAddress', to: undefined },
  })),
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  updateEditableParams: jest.fn(),
}));

jest.mock('../../MoneyAccountSelector', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onAccountSelected,
    }: {
      onAccountSelected: (address: string) => void;
      selectedAddress?: string;
    }) => (
      <TouchableOpacity
        testID="money-account-selector-pill"
        onPress={() => onAccountSelected('0xTestAddress')}
      >
        <Text>Select recipient</Text>
      </TouchableOpacity>
    ),
  };
});

describe('MoneyAccountDepositInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useTransactionMetadataRequest } = jest.requireMock(
      '../../../hooks/transactions/useTransactionMetadataRequest',
    );
    useTransactionMetadataRequest.mockReturnValue({
      id: 'mock-tx-id',
      chainId: '0x1',
      txParams: { from: '0xFromAddress', to: undefined },
    });
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
});

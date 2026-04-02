import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
        {props.afterPayWith as React.ReactNode}
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

jest.mock('../../../hooks/pay/useTransactionPayWithdraw', () => ({
  useTransactionPayWithdraw: jest.fn(() => ({
    isWithdraw: true,
    canSelectWithdrawToken: true,
  })),
}));

jest.mock('../../AccountSelector', () => {
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
        <Text>Select account</Text>
      </TouchableOpacity>
    ),
  };
});

describe('MoneyAccountWithdrawInfo', () => {
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

  it('renders AccountSelector', () => {
    const { getByTestId } = render(<MoneyAccountWithdrawInfo />);

    expect(getByTestId('money-account-selector-pill')).toBeOnTheScreen();
  });

  it('calls updateEditableParams with selected address as from', () => {
    const { updateEditableParams } = jest.requireMock(
      '../../../../../../util/transaction-controller',
    );
    const { getByTestId } = render(<MoneyAccountWithdrawInfo />);

    fireEvent.press(getByTestId('money-account-selector-pill'));

    expect(updateEditableParams).toHaveBeenCalledWith('mock-tx-id', {
      to: '0xTestAddress',
    });
  });

  it('disables confirm when no source account is selected', () => {
    render(<MoneyAccountWithdrawInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.disableConfirm).toBe(true);
  });

  it('does not call updateEditableParams when transactionMeta has no id', () => {
    const { useTransactionMetadataRequest } = jest.requireMock(
      '../../../hooks/transactions/useTransactionMetadataRequest',
    );
    useTransactionMetadataRequest.mockReturnValueOnce(null);

    const { updateEditableParams } = jest.requireMock(
      '../../../../../../util/transaction-controller',
    );
    const { getByTestId } = render(<MoneyAccountWithdrawInfo />);

    fireEvent.press(getByTestId('money-account-selector-pill'));

    expect(updateEditableParams).not.toHaveBeenCalled();
  });
});

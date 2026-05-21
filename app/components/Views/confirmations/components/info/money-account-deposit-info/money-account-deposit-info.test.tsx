import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MoneyAccountDepositInfo,
  MONEY_ACCOUNT_CURRENCY,
} from './money-account-deposit-info';

const mockUseMoneyAccountDepositNavbar = jest.fn();
jest.mock('../../../../../UI/Money/hooks/useMoneyAccountDepositNavbar', () => ({
  useMoneyAccountDepositNavbar: () => mockUseMoneyAccountDepositNavbar(),
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

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) =>
    ({ 'confirm.title.money_account_add_money': 'Add funds' })[key] ?? key,
}));

describe('MoneyAccountDepositInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomAmountInfo.mockClear();
    mockUseMoneyAccountDepositNavbar.mockReturnValue(undefined);
    // Default: no route params (Convert-crypto enters without a preferred token).
    mockUseParams.mockReturnValue({});
  });

  const getLastCustomAmountInfoProps = () =>
    mockCustomAmountInfo.mock.calls[
      mockCustomAmountInfo.mock.calls.length - 1
    ][0];

  it('renders CustomAmountInfo with usd currency', () => {
    const { getByTestId } = render(<MoneyAccountDepositInfo />);

    expect(getByTestId('custom-amount-info')).toBeOnTheScreen();
    expect(getByTestId('custom-amount-info').props.children).toBe(
      MONEY_ACCOUNT_CURRENCY,
    );
  });

  it('installs the navbar via useMoneyAccountDepositNavbar', () => {
    render(<MoneyAccountDepositInfo />);

    expect(mockUseMoneyAccountDepositNavbar).toHaveBeenCalledTimes(1);
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

  it('passes hasMax=true to CustomAmountInfo', () => {
    render(<MoneyAccountDepositInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.hasMax).toBe(true);
  });

  it('passes preferredToken=undefined to CustomAmountInfo for the Convert-crypto path', () => {
    mockUseParams.mockReturnValue({});

    render(<MoneyAccountDepositInfo />);

    const props = getLastCustomAmountInfoProps();
    expect(props.preferredToken).toBeUndefined();
  });

  it('passes the route preferredPaymentToken as preferredToken in the Move-mUSD context', () => {
    const preferredPaymentToken = {
      address: '0xmusd',
      chainId: '0x1',
    };
    mockUseParams.mockReturnValue({ preferredPaymentToken });

    render(<MoneyAccountDepositInfo />);

    const props = getLastCustomAmountInfoProps();
    expect(props.preferredToken).toEqual(preferredPaymentToken);
  });
});

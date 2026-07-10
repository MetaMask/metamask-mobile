import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MoneyAccountDepositInfo,
  MONEY_ACCOUNT_CURRENCY,
} from './money-account-deposit-info';

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

const mockUseNavbar = jest.fn();
jest.mock('../../../hooks/ui/useNavbar', () => ({
  __esModule: true,
  default: (title: string, addBackButton: boolean) =>
    mockUseNavbar(title, addBackButton),
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
  strings: (key: string) =>
    ({ 'confirm.title.money_account_add_money': 'Add funds' })[key] ?? key,
}));

describe('MoneyAccountDepositInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomAmountInfo.mockClear();
    mockUseNavbar.mockReturnValue(undefined);
    mockUseParams.mockReturnValue({});
  });

  it('renders CustomAmountInfo with usd currency', () => {
    const { getByTestId } = render(<MoneyAccountDepositInfo />);

    expect(getByTestId('custom-amount-info')).toBeOnTheScreen();
    expect(getByTestId('custom-amount-info').props.children).toBe(
      MONEY_ACCOUNT_CURRENCY,
    );
  });

  it('installs the navbar with the add money title and a back button', () => {
    render(<MoneyAccountDepositInfo />);

    expect(mockUseNavbar).toHaveBeenCalledTimes(1);
    expect(mockUseNavbar).toHaveBeenCalledWith('Add funds', true);
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

  it('passes autoSelectFiatPayment and hideAccountSelector from route params', () => {
    mockUseParams.mockReturnValue({ autoSelectFiatPayment: true });

    render(<MoneyAccountDepositInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.autoSelectFiatPayment).toBe(true);
    expect(lastCall.hideAccountSelector).toBe(true);
  });

  it('forwards preferredPaymentToken from route params to CustomAmountInfo', () => {
    const preferredPaymentToken = {
      address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
      chainId: '0x1',
    };
    mockUseParams.mockReturnValueOnce({ preferredPaymentToken });

    render(<MoneyAccountDepositInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.preferredToken).toEqual(preferredPaymentToken);
  });

  it('does not pass autoSelectFiatPayment when route param is absent', () => {
    mockUseParams.mockReturnValue({});

    render(<MoneyAccountDepositInfo />);

    const lastCall =
      mockCustomAmountInfo.mock.calls[
        mockCustomAmountInfo.mock.calls.length - 1
      ][0];
    expect(lastCall.autoSelectFiatPayment).toBeUndefined();
    expect(lastCall.hideAccountSelector).toBeUndefined();
  });
});

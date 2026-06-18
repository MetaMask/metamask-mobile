import React from 'react';
import { render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import CashbackActivityItem from './CashbackActivityItem';
import type { CashbackTransaction } from '../../types/moneyActivity';

// Selectors are stubbed to plain getters and useSelector just invokes them, so
// the component's currency/rate wiring runs without a full redux store.
jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'usd',
  selectCurrencyRates: () => ({
    ETH: { conversionRate: 2000, usdConversionRate: 2000 },
  }),
}));

const mockRowView = jest.fn((_props: unknown) => null);
jest.mock('../MoneyActivityItem/ActivityRowView', () => ({
  __esModule: true,
  default: (props: unknown) => mockRowView(props),
}));

const cashback: CashbackTransaction = {
  hash: '0xabc' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token: {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex,
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '300000',
  from: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0' as Hex,
};

interface CapturedRowProps {
  id: string;
  chainId: string;
  onPress?: (id: string) => void;
  display: {
    icon: IconName;
    primaryAmount: string;
    fiatAmount: string;
    status: string;
    isIncoming: boolean;
  };
}

describe('CashbackActivityItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('feeds a cashback display (Card icon, incoming amount) into the row view', () => {
    // Act
    render(<CashbackActivityItem cashback={cashback} />);

    // Assert
    expect(mockRowView).toHaveBeenCalledTimes(1);
    const props = mockRowView.mock.calls[0][0] as unknown as CapturedRowProps;
    expect(props.id).toBe(cashback.hash);
    expect(props.chainId).toBe('0x8f');
    expect(props.display.status).toBe('confirmed');
    expect(props.display.icon).toBe(IconName.Card);
    expect(props.display.isIncoming).toBe(true);
    expect(props.display.primaryAmount).toBe('+0.30 mUSD');
    expect(props.display.fiatAmount).toContain('0.30');
  });

  it('navigates to the cashback details sheet with the cashback param on press', () => {
    // Arrange
    render(<CashbackActivityItem cashback={cashback} />);
    const props = mockRowView.mock.calls[0][0] as unknown as CapturedRowProps;

    // Act
    props.onPress?.(cashback.hash);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('MoneyModals', {
      screen: 'MoneyCashbackTransactionDetailsSheet',
      params: { cashback },
    });
  });
});

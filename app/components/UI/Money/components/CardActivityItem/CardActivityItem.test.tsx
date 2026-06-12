import React from 'react';
import { render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import CardActivityItem from './CardActivityItem';
import type { CardTransaction } from '../../types/moneyActivity';

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

const card: CardTransaction = {
  hash: '0xabc' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token: {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex,
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '5381986',
  to: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
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
  };
}

describe('CardActivityItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('feeds a card display (Card icon, outgoing amount) into the row view', () => {
    // Act
    render(<CardActivityItem card={card} />);

    // Assert
    expect(mockRowView).toHaveBeenCalledTimes(1);
    const props = mockRowView.mock.calls[0][0] as unknown as CapturedRowProps;
    expect(props.id).toBe(card.hash);
    expect(props.chainId).toBe('0x8f');
    expect(props.display.status).toBe('confirmed');
    expect(props.display.icon).toBe(IconName.Card);
    expect(props.display.primaryAmount).toBe('-5.38 mUSD');
    expect(props.display.fiatAmount).toContain('5.38');
  });

  it('navigates to the card details sheet with the card param on press', () => {
    // Arrange
    render(<CardActivityItem card={card} />);
    const props = mockRowView.mock.calls[0][0] as unknown as CapturedRowProps;

    // Act
    props.onPress?.(card.hash);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('MoneyModals', {
      screen: 'MoneyCardTransactionDetailsSheet',
      params: { card },
    });
  });
});

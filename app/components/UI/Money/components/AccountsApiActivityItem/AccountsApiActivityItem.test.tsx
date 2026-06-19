import React from 'react';
import { render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import AccountsApiActivityItem from './AccountsApiActivityItem';
import type { AccountsApiActivity } from '../../types/moneyActivity';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';

jest.mock('../../selectors/featureFlags', () => ({
  selectMoneyEnableActivityDetailsFlag: jest.fn(),
}));

const mockedSelectActivityDetailsFlag = jest.mocked(
  selectMoneyEnableActivityDetailsFlag,
);

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

const token = {
  address: '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex,
  symbol: 'mUSD',
  decimals: 6,
};

const card: AccountsApiActivity = {
  kind: 'card',
  hash: '0xcard' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token,
  amount: '5381986',
  paidTo: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
};

const cashback: AccountsApiActivity = {
  kind: 'cashback',
  hash: '0xback' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token,
  amount: '300000',
  receivedFrom: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0' as Hex,
};

interface CapturedRowProps {
  id: string;
  chainId: string;
  onPress?: (id: string) => void;
  display: {
    icon: IconName;
    primaryAmount: string;
    isIncoming: boolean;
    status: string;
  };
}

const lastRowProps = () =>
  mockRowView.mock.calls[0][0] as unknown as CapturedRowProps;

describe('AccountsApiActivityItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectActivityDetailsFlag.mockReturnValue(true);
  });

  it('feeds a card spend (outgoing amount) into the row view', () => {
    render(<AccountsApiActivityItem activity={card} />);

    const props = lastRowProps();
    expect(props.id).toBe(card.hash);
    expect(props.chainId).toBe('0x8f');
    expect(props.display.status).toBe('confirmed');
    expect(props.display.icon).toBe(IconName.Card);
    expect(props.display.isIncoming).toBe(false);
    expect(props.display.primaryAmount).toBe('-5.38 mUSD');
  });

  it('feeds a cashback credit (incoming amount) into the row view', () => {
    render(<AccountsApiActivityItem activity={cashback} />);

    const props = lastRowProps();
    expect(props.display.isIncoming).toBe(true);
    expect(props.display.primaryAmount).toBe('+0.30 mUSD');
  });

  it('navigates to the full-screen activity details with the activity on press', () => {
    render(<AccountsApiActivityItem activity={card} />);

    lastRowProps().onPress?.(card.hash);

    expect(mockNavigate).toHaveBeenCalledWith('MoneyCardTransactionDetails', {
      activity: card,
    });
  });

  it('navigates to the full-screen activity details for cashback too', () => {
    render(<AccountsApiActivityItem activity={cashback} />);

    lastRowProps().onPress?.(cashback.hash);

    expect(mockNavigate).toHaveBeenCalledWith('MoneyCardTransactionDetails', {
      activity: cashback,
    });
  });

  it('passes undefined onPress when moneyEnableActivityDetails flag is off', () => {
    mockedSelectActivityDetailsFlag.mockReturnValue(false);

    render(<AccountsApiActivityItem activity={card} />);

    expect(lastRowProps().onPress).toBeUndefined();
  });
});

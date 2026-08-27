import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import MoneyActivityRow from './MoneyActivityRow';
import {
  accountsApiItem,
  cardProviderItem,
  onchainItem,
  type AccountsApiActivity,
} from '../../types/moneyActivity';
import Routes from '../../../../../constants/navigation/Routes';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectMoneyEnableActivityDetailsFlag: jest.fn(() => true),
}));

jest.mock('../MoneyActivityItem/MoneyActivityItem', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      tx,
      privacyMode,
    }: {
      tx: { id: string };
      privacyMode?: boolean;
    }) => (
      <Text testID="onchain-row" accessibilityHint={String(privacyMode)}>
        {tx.id}
      </Text>
    ),
  };
});

jest.mock('../AccountsApiActivityItem/AccountsApiActivityItem', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      activity,
      privacyMode,
    }: {
      activity: { hash: string };
      privacyMode?: boolean;
    }) => (
      <Text testID="api-row" accessibilityHint={String(privacyMode)}>
        {activity.hash}
      </Text>
    ),
  };
});

jest.mock(
  '../../../Card/components/CardTransactionRow/CardTransactionRow',
  () => {
    const { Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        transaction,
        privacyMode,
        onPress,
      }: {
        transaction: { id: string };
        privacyMode?: boolean;
        onPress?: (tx: { id: string }) => void;
      }) => (
        <Pressable
          testID="card-provider-row"
          accessibilityHint={String(privacyMode)}
          accessibilityState={{ disabled: !onPress }}
          onPress={() => onPress?.(transaction)}
        >
          <Text>{transaction.id}</Text>
        </Pressable>
      ),
    };
  },
);

const mockedSelectActivityDetailsFlag = jest.mocked(
  selectMoneyEnableActivityDetailsFlag,
);

const tx = { id: 'tx-1', time: 100 } as TransactionMeta;
const card: AccountsApiActivity = {
  kind: 'card',
  hash: '0xfeed' as Hex,
  time: 200,
  chainId: '0x8f',
  token: { address: '0x0' as Hex, symbol: 'USDC', decimals: 6 },
  amount: '1000000',
  paidTo: '0xbaanx' as Hex,
};

const declinedCard: CardTransaction = {
  id: 'declined-1',
  providerId: 'baanx',
  timestamp: 300,
  status: CardTransactionStatus.Failed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '12.00', currency: 'USD' },
  fundingSources: [],
};

describe('MoneyActivityRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectActivityDetailsFlag.mockReturnValue(true);
  });

  it('renders the on-chain row for an onchain item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow item={onchainItem(tx)} moneyAddress="0x1" />,
    );

    expect(getByTestId('onchain-row')).toHaveTextContent('tx-1');
    expect(queryByTestId('api-row')).toBeNull();
    expect(queryByTestId('card-provider-row')).toBeNull();
  });

  it('renders the Accounts-API row for an accountsApi item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow item={accountsApiItem(card)} moneyAddress="0x1" />,
    );

    expect(getByTestId('api-row')).toHaveTextContent('0xfeed');
    expect(queryByTestId('onchain-row')).toBeNull();
    expect(queryByTestId('card-provider-row')).toBeNull();
  });

  it('renders the Card provider row for a cardProvider item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow
        item={cardProviderItem(declinedCard)}
        moneyAddress="0x1"
      />,
    );

    expect(getByTestId('card-provider-row')).toHaveTextContent('declined-1');
    expect(queryByTestId('onchain-row')).toBeNull();
    expect(queryByTestId('api-row')).toBeNull();
  });

  it('forwards privacyMode to the on-chain row', () => {
    const { getByTestId } = render(
      <MoneyActivityRow
        item={onchainItem(tx)}
        moneyAddress="0x1"
        privacyMode
      />,
    );

    expect(getByTestId('onchain-row').props.accessibilityHint).toBe('true');
  });

  it('forwards privacyMode to the Accounts-API row', () => {
    const { getByTestId } = render(
      <MoneyActivityRow
        item={accountsApiItem(card)}
        moneyAddress="0x1"
        privacyMode
      />,
    );

    expect(getByTestId('api-row').props.accessibilityHint).toBe('true');
  });

  it('forwards privacyMode to the Card provider row', () => {
    const { getByTestId } = render(
      <MoneyActivityRow
        item={cardProviderItem(declinedCard)}
        moneyAddress="0x1"
        privacyMode
      />,
    );

    expect(getByTestId('card-provider-row').props.accessibilityHint).toBe(
      'true',
    );
  });

  it('navigates to card details when a declined row is pressed and details are enabled', () => {
    const { getByTestId } = render(
      <MoneyActivityRow
        item={cardProviderItem(declinedCard)}
        moneyAddress="0x1"
      />,
    );

    fireEvent.press(getByTestId('card-provider-row'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.CARD_TRANSACTION_DETAILS,
      { cardTransaction: declinedCard },
    );
  });

  it('does not attach onPress when activity details are disabled', () => {
    mockedSelectActivityDetailsFlag.mockReturnValue(false);

    const { getByTestId } = render(
      <MoneyActivityRow
        item={cardProviderItem(declinedCard)}
        moneyAddress="0x1"
      />,
    );

    expect(getByTestId('card-provider-row').props.accessibilityState).toEqual({
      disabled: true,
    });

    fireEvent.press(getByTestId('card-provider-row'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

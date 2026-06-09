import React from 'react';
import { render } from '@testing-library/react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import MoneyActivityRow from './MoneyActivityRow';
import {
  cardItem,
  onchainItem,
  type CardTransaction,
} from '../../types/moneyActivity';

jest.mock('../MoneyActivityItem/MoneyActivityItem', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ tx }: { tx: { id: string } }) => (
      <Text testID="onchain-row">{tx.id}</Text>
    ),
  };
});

jest.mock('../CardActivityItem/CardActivityItem', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ card }: { card: { hash: string } }) => (
      <Text testID="card-row">{card.hash}</Text>
    ),
  };
});

const tx = { id: 'tx-1', time: 100 } as TransactionMeta;
const card: CardTransaction = {
  hash: '0xfeed' as Hex,
  time: 200,
  chainId: '0x8f',
  token: { address: '0x0' as Hex, symbol: 'USDC', decimals: 6 },
  amount: '1000000',
  to: '0xbaanx' as Hex,
};

describe('MoneyActivityRow', () => {
  it('renders the on-chain row for an onchain item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow item={onchainItem(tx)} moneyAddress="0x1" />,
    );

    expect(getByTestId('onchain-row')).toHaveTextContent('tx-1');
    expect(queryByTestId('card-row')).toBeNull();
  });

  it('renders the card row for a card item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow item={cardItem(card)} moneyAddress="0x1" />,
    );

    expect(getByTestId('card-row')).toHaveTextContent('0xfeed');
    expect(queryByTestId('onchain-row')).toBeNull();
  });
});

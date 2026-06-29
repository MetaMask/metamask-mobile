import React from 'react';
import { render } from '@testing-library/react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import MoneyActivityRow from './MoneyActivityRow';
import {
  accountsApiItem,
  onchainItem,
  rampOrderItem,
  type AccountsApiActivity,
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

jest.mock('../AccountsApiActivityItem/AccountsApiActivityItem', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ activity }: { activity: { hash: string } }) => (
      <Text testID="api-row">{activity.hash}</Text>
    ),
  };
});

jest.mock('../RampOrderActivityItem/RampOrderActivityItem', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ order }: { order: { providerOrderId: string } }) => (
      <Text testID="ramp-order-row">{order.providerOrderId}</Text>
    ),
  };
});

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
const rampOrder = {
  providerOrderId: 'ramp-order-1',
  createdAt: 300,
  walletAddress: '0x1',
  status: RampsOrderStatus.Completed,
} as RampsOrder;

describe('MoneyActivityRow', () => {
  it('renders the on-chain row for an onchain item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow item={onchainItem(tx)} moneyAddress="0x1" />,
    );

    expect(getByTestId('onchain-row')).toHaveTextContent('tx-1');
    expect(queryByTestId('api-row')).toBeNull();
  });

  it('renders the Accounts-API row for an accountsApi item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow item={accountsApiItem(card)} moneyAddress="0x1" />,
    );

    expect(getByTestId('api-row')).toHaveTextContent('0xfeed');
    expect(queryByTestId('onchain-row')).toBeNull();
  });

  it('renders the ramp order row for a rampOrder item', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyActivityRow item={rampOrderItem(rampOrder)} moneyAddress="0x1" />,
    );

    expect(getByTestId('ramp-order-row')).toHaveTextContent('ramp-order-1');
    expect(queryByTestId('onchain-row')).toBeNull();
    expect(queryByTestId('api-row')).toBeNull();
  });
});

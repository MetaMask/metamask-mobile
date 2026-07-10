import React from 'react';
import { render } from '@testing-library/react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import MoneyActivityRow from './MoneyActivityRow';
import {
  accountsApiItem,
  onchainItem,
  type AccountsApiActivity,
} from '../../types/moneyActivity';

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
});

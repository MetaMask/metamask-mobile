import React from 'react';
import {
  SolScope,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import { measureRenders } from 'reassure';
import MultichainTransactionsView from './MultichainTransactionsView';

const mockNavigation = {
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('react-redux', () => ({
  useSelector: () => false,
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      icon: { default: 'icon-default' },
      primary: { default: 'primary-default' },
    },
  }),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(),
  }),
}));

jest.mock(
  '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys',
  () => ({
    useMultichainActivityMaliciousTokenKeys: () => ({
      maliciousTokenKeys: new Set(),
    }),
  }),
);

jest.mock('../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash', () => ({
  useBridgeHistoryItemBySrcTxHash: () => ({
    bridgeHistoryItemsBySrcTxHash: {},
  }),
}));

jest.mock('../../UI/MultichainTransactionListItem', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({ transaction }: { transaction: Transaction }) =>
    ReactActual.createElement(Text, null, transaction.id);
});

jest.mock('../MultichainTransactionsView/MultichainTransactionsFooter', () => ({
  __esModule: true,
  default: () => null,
}));

const transactions: Transaction[] = Array.from(
  { length: 100 },
  (_value, index) => ({
    id: `solana-transaction-${index}`,
    chain: SolScope.Mainnet,
    account: 'selected-address',
    from: [{ address: `sender-${index}`, asset: null }],
    to: [{ address: `recipient-${index}`, asset: null }],
    events: [],
    fees: [],
    value: String(index + 1),
    type: index % 2 === 0 ? TransactionType.Send : TransactionType.Receive,
    status: TransactionStatus.Confirmed,
    timestamp: 1_750_000_000 - index,
  }),
);

test('MultichainTransactionsView mount performance with 100 transactions', async () => {
  await measureRenders(
    <MultichainTransactionsView
      transactions={transactions}
      selectedAddress="selected-address"
      chainId={SolScope.Mainnet}
    />,
  );
});

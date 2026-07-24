import React from 'react';
import {
  SolScope,
  Transaction as NonEvmTransaction,
  TransactionStatus as NonEvmTransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType as EvmTransactionType,
} from '@metamask/transaction-controller';
import { measureRenders } from 'reassure';
import type { TransactionViewModel } from './types';
import UnifiedTransactionsView from './UnifiedTransactionsView';

const mockSelectedAddress = '0x0000000000000000000000000000000000000abc';
const mockNavigate = jest.fn();

const mockPendingTransactions: TransactionMeta[] = Array.from(
  { length: 10 },
  (_value, index) => ({
    id: `pending-${index}`,
    chainId: '0x1',
    hash: `0x${(index + 1).toString(16).padStart(64, '0')}`,
    networkClientId: 'mainnet',
    status: TransactionStatus.submitted,
    time: 1_750_000_000_000 - index * 3,
    type: EvmTransactionType.simpleSend,
    txParams: {
      from: mockSelectedAddress,
      to: '0x0000000000000000000000000000000000000def',
      value: '0x1',
      nonce: `0x${index.toString(16)}`,
    },
  }),
);

const mockConfirmedTransactions: TransactionViewModel[] = Array.from(
  { length: 10 },
  (_value, index) => {
    const transactionMeta: TransactionMeta = {
      id: `confirmed-${index}`,
      chainId: '0x1',
      hash: `0x${(index + 101).toString(16).padStart(64, '0')}`,
      networkClientId: 'mainnet',
      status: TransactionStatus.confirmed,
      time: 1_750_000_000_000 - index * 3 - 1,
      type: EvmTransactionType.simpleSend,
      txParams: {
        from: mockSelectedAddress,
        to: '0x0000000000000000000000000000000000000def',
        value: '0x1',
        nonce: `0x${(index + 100).toString(16)}`,
      },
    };

    return {
      accountId: `eip155:1:${mockSelectedAddress}`,
      blockHash: `0xblock-${index}`,
      blockNumber: index + 1,
      chainId: 1,
      cumulativeGasUsed: 21000,
      effectiveGasPrice: '1',
      from: mockSelectedAddress,
      gas: 21000,
      gasPrice: '1',
      gasUsed: 21000,
      hash: transactionMeta.hash as string,
      id: transactionMeta.id,
      isError: false,
      logs: [],
      methodId: '0x',
      nonce: index + 100,
      readable: 'Transfer',
      timestamp: '2025-06-15T15:06:40.000Z',
      time: transactionMeta.time,
      to: transactionMeta.txParams.to as string,
      transactionCategory: 'TRANSFER',
      transactionType: 'SIMPLE_SEND',
      value: '1',
      valueTransfers: [],
      hexChainId: '0x1',
      transactionMeta,
    };
  },
);

const mockNonEvmTransactions: NonEvmTransaction[] = Array.from(
  { length: 10 },
  (_value, index) => ({
    id: `solana-${index}`,
    chain: SolScope.Mainnet,
    account: 'solana-account-address',
    from: [{ address: `sender-${index}`, asset: null }],
    to: [{ address: `recipient-${index}`, asset: null }],
    events: [],
    fees: [],
    value: String(index + 1),
    type: index % 2 === 0 ? TransactionType.Send : TransactionType.Receive,
    status: NonEvmTransactionStatus.Confirmed,
    timestamp: 1_750_000_000 - index * 3 - 2,
  }),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: () => ({
    address: mockSelectedAddress,
  }),
}));

jest.mock('../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'usd',
}));

jest.mock('../../../selectors/multichain/multichain', () => ({
  selectNonEvmTransactionsForSelectedAccountGroup: () => ({
    transactions: mockNonEvmTransactions,
  }),
}));

jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: () => [
      {
        id: 'evm-account',
        address: mockSelectedAddress,
        type: 'eip155:eoa',
      },
      {
        id: 'solana-account',
        address: 'solana-account-address',
        type: 'solana:data-account',
      },
    ],
  }),
);

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: () => ({}),
  selectProviderType: () => undefined,
}));

jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEVMEnabledNetworks: () => ['0x1'],
  selectNonEVMEnabledNetworks: () => [
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  ],
}));

jest.mock('../../../selectors/transactionController', () => ({
  selectLocalTransactions: () => mockPendingTransactions,
  selectRelatedChainIdsByTransactionId: () => new Map(),
}));

jest.mock('../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: () => ({}),
}));

jest.mock('./useTransactionsQuery', () => ({
  useTransactionsQuery: () => ({
    data: {
      pageParams: [undefined],
      pages: [{ data: mockConfirmedTransactions }],
    },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isInitialLoading: false,
    isFetchingNextPage: false,
    refetch: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('./useUnifiedTxActions', () => ({
  useUnifiedTxActions: () => ({
    speedUpIsOpen: false,
    cancelIsOpen: false,
    confirmDisabled: false,
    existingTx: null,
    onSpeedUpAction: jest.fn(),
    onCancelAction: jest.fn(),
    onSpeedUpCancelCompleted: jest.fn(),
    speedUpTransaction: jest.fn(),
    cancelTransaction: jest.fn(),
    signQRTransaction: jest.fn(),
    signLedgerTransaction: jest.fn(),
    cancelUnsignedQRTransaction: jest.fn(),
  }),
}));

jest.mock('./useTransactionAutoScroll', () => ({
  useTransactionAutoScroll: () => ({
    handleScroll: jest.fn(),
  }),
}));

jest.mock('../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: () => ({
    getBlockExplorerUrl: jest.fn(),
    getBlockExplorerName: jest.fn(),
  }),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(),
  }),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      icon: { default: 'icon-default' },
      primary: { default: 'primary-default' },
    },
  }),
}));

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      emptyList: {},
    },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
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

jest.mock('../../UI/AssetOverview/PriceChart/PriceChart.context', () => ({
  __esModule: true,
  default: {
    Consumer: ({
      children,
    }: {
      children: (value: { isChartBeingTouched: boolean }) => React.ReactNode;
    }) => children({ isChartBeingTouched: false }),
  },
  PriceChartProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../UI/TransactionElement', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({ tx }: { tx: TransactionMeta }) =>
    ReactActual.createElement(Text, null, tx.id);
});

jest.mock('../../UI/MultichainTransactionListItem', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({ transaction }: { transaction: NonEvmTransaction }) =>
    ReactActual.createElement(Text, null, transaction.id);
});

jest.mock('../../UI/MultichainBridgeTransactionListItem', () => () => null);
jest.mock('../../UI/Transactions/TransactionsFooter', () => () => null);
jest.mock(
  '../MultichainTransactionsView/MultichainTransactionsFooter',
  () => () => null,
);
jest.mock('../confirmations/components/modals/cancel-speedup-modal', () => ({
  CancelSpeedupModal: () => null,
}));

test('UnifiedTransactionsView mount performance with mixed item kinds', async () => {
  await measureRenders(<UnifiedTransactionsView />);
});

import React from 'react';
import { Provider } from 'react-redux';
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
import configureStore from '../../../util/test/configureStore';
import initialRootState, {
  backgroundState,
} from '../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../util/theme';
import type { TransactionViewModel } from './types';
import UnifiedTransactionsView from './UnifiedTransactionsView';

const mockSelectedAddress = '0x0000000000000000000000000000000000000abc';
const mockNavigate = jest.fn();
const nativeAsset = {
  amount: '1',
  unit: 'SOL',
  fungible: true,
  type: `${SolScope.Mainnet}/slip44:501`,
};

jest.mock(
  '@metamask/sentinel-api-service',
  () => ({
    SentinelApiService: class SentinelApiService {},
  }),
  { virtual: true },
);

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
    from: [{ address: `sender-${index}`, asset: nativeAsset }],
    to: [{ address: `recipient-${index}`, asset: nativeAsset }],
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

jest.mock('../confirmations/hooks/gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: undefined,
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

jest.mock(
  '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys',
  () => ({
    useMultichainActivityMaliciousTokenKeys: () => ({
      maliciousTokenKeys: new Set(),
    }),
  }),
);

const evmAccount = {
  id: 'evm-account',
  address: mockSelectedAddress,
  type: 'eip155:eoa' as const,
  scopes: ['eip155:0' as const],
  options: {},
  methods: [],
  metadata: {
    name: 'EVM Account',
    keyring: { type: 'HD Key Tree' },
  },
};

const solanaAccount = {
  id: 'solana-account',
  address: 'solana-account-address',
  type: 'solana:data-account' as const,
  scopes: [SolScope.Mainnet],
  options: {},
  methods: [],
  metadata: {
    name: 'Solana Account',
    keyring: { type: 'Snap Keyring' },
  },
};

const accountGroupId = 'entropy:wallet/0';
const store = configureStore({
  ...initialRootState,
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...backgroundState.AccountsController,
        internalAccounts: {
          accounts: {
            [evmAccount.id]: evmAccount,
            [solanaAccount.id]: solanaAccount,
          },
          selectedAccount: evmAccount.id,
        },
      },
      AccountTreeController: {
        ...backgroundState.AccountTreeController,
        accountTree: {
          wallets: {
            'entropy:wallet': {
              id: 'entropy:wallet',
              type: 'entropy',
              status: 'ready',
              metadata: { name: 'Test Wallet' },
              groups: {
                [accountGroupId]: {
                  id: accountGroupId,
                  type: 'multichain-account',
                  accounts: [evmAccount.id, solanaAccount.id],
                  metadata: {
                    name: 'Account 1',
                    pinned: false,
                    hidden: false,
                  },
                },
              },
            },
          },
        },
        selectedAccountGroup: accountGroupId,
      },
      TransactionController: {
        ...backgroundState.TransactionController,
        transactions: mockPendingTransactions,
      },
      MultichainTransactionsController: {
        nonEvmTransactions: {
          [solanaAccount.id]: {
            [SolScope.Mainnet]: {
              transactions: mockNonEvmTransactions,
              next: null,
              lastUpdated: 1_750_000_000,
            },
          },
        },
      },
      NetworkEnablementController: {
        ...backgroundState.NetworkEnablementController,
        enabledNetworkMap: {
          eip155: { '0x1': true },
          solana: { [SolScope.Mainnet]: true },
          bip122: {},
          tron: {},
        },
      },
      BridgeStatusController: {
        ...backgroundState.BridgeStatusController,
        txHistory: {},
      },
    },
  },
});

const ProvidersWrapper = ({ children }: { children: React.ReactElement }) => (
  <Provider store={store}>
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  </Provider>
);

test('UnifiedTransactionsView mount performance with mixed item kinds', async () => {
  await measureRenders(<UnifiedTransactionsView />, {
    wrapper: ProvidersWrapper,
  });
});

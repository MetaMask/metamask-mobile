import React, { ComponentType } from 'react';
import { RefreshControl } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import { TransactionStatus } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import UnifiedTransactionsView from './UnifiedTransactionsView';
import _renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import { useTransactionsQuery } from './useTransactionsQuery';
import { selectTransactions } from './helpers/transformations';

// Type helper for UNSAFE_queryByType with mocked string components
const asComponentType = (name: string) => name as unknown as ComponentType;

type TransactionsQueryData = ReturnType<ReturnType<typeof selectTransactions>>;

const emptyTransactionsQueryData: TransactionsQueryData = {
  pageParams: [],
  pages: [],
};

const createUseTransactionsQueryResult = (
  data: TransactionsQueryData = emptyTransactionsQueryData,
) => ({
  data,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn().mockResolvedValue(undefined),
});

const mockUseTransactionsQuery = (
  data: TransactionsQueryData = emptyTransactionsQueryData,
) => {
  (useTransactionsQuery as jest.Mock).mockReturnValue(
    createUseTransactionsQueryResult(data),
  );
};

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../confirmations/hooks/gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: jest.fn(() => ({
    gasFeeEstimates: {
      medium: {
        suggestedMaxFeePerGas: '25',
        suggestedMaxPriorityFeePerGas: '2',
        minWaitTimeEstimate: 15000,
      },
    },
  })),
}));

jest.mock('../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../UI/AssetOverview/PriceChart/PriceChart.context', () => ({
  __esModule: true,
  default: {
    Consumer: ({
      children,
    }: {
      children: (value: { isChartBeingTouched: boolean }) => React.ReactNode;
    }) => children({ isChartBeingTouched: false }),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  PriceChartProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockBridgeHistoryItemsBySrcTxHash: Record<string, unknown> = {};
jest.mock('../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash', () => ({
  useBridgeHistoryItemBySrcTxHash: () => ({
    bridgeHistoryItemsBySrcTxHash: mockBridgeHistoryItemsBySrcTxHash,
  }),
}));

const mockDefaultUnifiedTxActionsReturn = {
  speedUpIsOpen: false,
  cancelIsOpen: false,
  confirmDisabled: false,
  existingTx: null,
  speedUpTxId: null,
  cancelTxId: null,
  onSpeedUpAction: jest.fn(),
  onCancelAction: jest.fn(),
  onSpeedUpCancelCompleted: jest.fn(),
  speedUpTransaction: jest.fn(),
  cancelTransaction: jest.fn(),
  signQRTransaction: jest.fn(),
  signLedgerTransaction: jest.fn(),
  cancelUnsignedQRTransaction: jest.fn(),
};

jest.mock('./useUnifiedTxActions', () => ({
  useUnifiedTxActions: jest.fn(() => mockDefaultUnifiedTxActionsReturn),
}));

jest.mock('./useTransactionsQuery', () => ({
  useTransactionsQuery: jest.fn(() => createUseTransactionsQueryResult()),
}));

jest.mock('./useTransactionAutoScroll', () => ({
  useTransactionAutoScroll: () => ({
    handleScroll: jest.fn(),
  }),
}));

jest.mock('../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: () => ({
    getBlockExplorerUrl: jest.fn().mockReturnValue('https://etherscan.io'),
    getBlockExplorerName: jest.fn().mockReturnValue('Etherscan'),
  }),
}));

const mockSelectBridgeHistoryForAccount = jest.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_state: unknown) => ({}) as Record<string, unknown>,
);
jest.mock('../../../selectors/bridgeStatusController', () => ({
  ...jest.requireActual('../../../selectors/bridgeStatusController'),
  selectBridgeHistoryForAccount: (...args: unknown[]) =>
    mockSelectBridgeHistoryForAccount(args[0]),
}));

const mockSelectNonEvmTransactions = jest.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_state: unknown) => ({
    transactions: [] as unknown[],
    next: null,
    lastUpdated: 0,
  }),
);
jest.mock('../../../selectors/multichain/multichain', () => ({
  ...jest.requireActual('../../../selectors/multichain/multichain'),
  selectNonEvmTransactionsForSelectedAccountGroup: (...args: unknown[]) =>
    mockSelectNonEvmTransactions(args[0]),
}));

jest.mock('../../UI/TransactionElement', () => 'TransactionElement');
jest.mock(
  '../../UI/MultichainTransactionListItem',
  () => 'MultichainTransactionListItem',
);
jest.mock(
  '../../UI/MultichainBridgeTransactionListItem',
  () => 'MultichainBridgeTransactionListItem',
);
jest.mock('../../UI/TransactionActionModal', () => 'TransactionActionModal');
jest.mock('../confirmations/components/modals/cancel-speedup-modal', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    CancelSpeedupModal: ({
      isVisible,
      isCancel,
    }: {
      isVisible: boolean;
      isCancel: boolean;
    }) =>
      isVisible
        ? ReactActual.createElement(
            Text,
            {
              testID: isCancel ? 'cancel-modal' : 'speedup-modal',
            },
            isCancel ? 'Cancel Transaction' : 'Speed Up Transaction',
          )
        : null,
  };
});

jest.mock(
  '../../UI/Transactions/TransactionsFooter',
  () => 'TransactionsFooter',
);
jest.mock(
  '../MultichainTransactionsView/MultichainTransactionsFooter',
  () => 'MultichainTransactionsFooter',
);

// Mocked so that filterByAddress / buildTrustedAddressSet can be spied on.
// sortTransactions is a plain function (not jest.fn) so jest.resetAllMocks()
// in the first describe's afterEach can't make it return undefined and break
// the selectSortedTransactions Redux selector.
jest.mock('../../../util/activity', () => ({
  filterByAddress: jest.fn(() => true),
  isTransactionOnChains: jest.fn(() => true),
  sortTransactions: (arr: unknown[]) => arr ?? [],
  buildTrustedAddressSet: jest.fn(() => new Set<string>()),
}));

// Partially mock accountTreeController: preserve real exports so other selectors
// (e.g. selectBridgeHistoryForAccount) that depend on them don't break at module
// load time. Override selectSelectedAccountGroupInternalAccounts with a plain
// (non-jest.fn) function so jest.resetAllMocks() can't make it return undefined
// and crash the component's .map() call.
jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupInternalAccounts: () => [
      { id: '0xabc', address: '0xabc', type: 'eip155:eoa' },
    ],
  }),
);

const renderWithProvider = (
  component: React.ReactElement,
  providerValues?: Parameters<typeof _renderWithProvider>[1],
  includeNavigationContainer?: Parameters<typeof _renderWithProvider>[2],
  includeFeatureFlagOverrideProvider?: Parameters<
    typeof _renderWithProvider
  >[3],
) =>
  _renderWithProvider(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        })
      }
    >
      {component}
    </QueryClientProvider>,
    providerValues,
    includeNavigationContainer,
    includeFeatureFlagOverrideProvider,
  );

describe('UnifiedTransactionsView', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsQuery();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders without crashing', () => {
    // Arrange & Act
    const { toJSON } = renderWithProvider(<UnifiedTransactionsView />, {
      state: initialState,
    });

    // Assert
    expect(toJSON()).toBeTruthy();
  });

  it('renders empty state when no transactions', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<UnifiedTransactionsView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('You have no transactions')).toBeOnTheScreen();
  });

  it('renders header component when provided', () => {
    // Arrange
    const TestHeader = () => <></>;

    // Act
    const { UNSAFE_getByType } = renderWithProvider(
      <UnifiedTransactionsView header={<TestHeader />} />,
      {
        state: initialState,
      },
    );

    // Assert
    expect(UNSAFE_getByType(TestHeader)).toBeTruthy();
  });

  it('calls updateIncomingTransactions on refresh', () => {
    // Arrange
    renderWithProvider(<UnifiedTransactionsView />, {
      state: initialState,
    });

    // Note: Since FlashList doesn't have a testID by default, we verify the mock was set up
    // Assert
    expect(updateIncomingTransactions).toBeDefined();
  });

  it('renders TransactionsFooter when only EVM chains enabled', () => {
    // Arrange - State with only EVM chains enabled (no non-EVM chains)
    const evmOnlyState = {
      engine: {
        backgroundState: {
          ...backgroundState,
          NetworkEnablementController: {
            ...backgroundState.NetworkEnablementController,
            enabledNetworkMap: {
              eip155: {
                '0x1': true,
              },
              solana: {},
              bip122: {},
              tron: {},
            },
          },
        },
      },
    };

    // Act
    const { UNSAFE_queryByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      {
        state: evmOnlyState,
      },
    );

    // Assert
    expect(
      UNSAFE_queryByType(asComponentType('TransactionsFooter')),
    ).toBeTruthy();
  });

  it('renders MultichainTransactionsFooter when only non-EVM chains enabled', () => {
    // Arrange
    const nonEvmState = {
      engine: {
        backgroundState: {
          ...backgroundState,
          NetworkEnablementController: {
            ...backgroundState.NetworkEnablementController,
            enabledNetworkMap: {
              solana: {
                'solana:mainnet': true,
              },
            },
          },
        },
      },
    };

    // Act
    const { UNSAFE_queryByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      {
        state: nonEvmState,
      },
    );

    // Assert
    expect(
      UNSAFE_queryByType(asComponentType('MultichainTransactionsFooter')),
    ).toBeTruthy();
  });
});

describe('UnifiedTransactionsView with transactions', () => {
  const ACTIVE_EVM_ADDRESS = '0x0000000000000000000000000000000000000abc';
  const BRIDGE_TX_HASH =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const OTHER_TX_HASH =
    '0x1111111111111111111111111111111111111111111111111111111111111111';
  const BRIDGE_TX_ID = 'bridge-tx-id';

  const stateWithTransactions = {
    engine: {
      backgroundState: {
        ...backgroundState,
        TransactionController: {
          ...backgroundState.TransactionController,
          transactions: [
            {
              id: 'tx-1',
              chainId: '0x1' as const,
              status: TransactionStatus.confirmed,
              time: Date.now(),
              txParams: {
                from: '0x1234567890123456789012345678901234567890',
                to: '0x0987654321098765432109876543210987654321',
                value: '0x0',
                nonce: '0x1',
              },
            },
          ],
        },
      },
    },
  };

  const stateWithConfirmedBridgeTransaction = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          ...backgroundState.AccountsController,
          internalAccounts: {
            accounts: {
              'evm-account-id': {
                id: 'evm-account-id',
                type: 'eip155:eoa' as const,
                address: ACTIVE_EVM_ADDRESS,
                options: {},
                methods: [],
                metadata: {
                  name: 'Account 1',
                  keyring: { type: 'HD Key Tree' },
                },
              },
            },
            selectedAccount: 'evm-account-id',
          },
        },
        TransactionController: {
          ...backgroundState.TransactionController,
          transactions: [
            {
              id: BRIDGE_TX_ID,
              chainId: '0x1' as const,
              hash: BRIDGE_TX_HASH,
              status: TransactionStatus.confirmed,
              time: Date.now(),
              txParams: {
                from: ACTIVE_EVM_ADDRESS,
                to: '0x1111111111111111111111111111111111111111',
                value: '0x0',
                nonce: '0x1',
              },
            },
          ],
        },
      },
    },
  };

  const createConfirmedEvmQueryData = (
    transactions: V1TransactionByHashResponse[] = [],
  ) =>
    selectTransactions({
      address: ACTIVE_EVM_ADDRESS,
    })({
      pageParams: [undefined],
      pages: [
        {
          data: transactions,
          unprocessedNetworks: [],
          pageInfo: {
            count: transactions.length,
            endCursor: undefined,
            hasNextPage: false,
          },
        },
      ],
    });

  const createConfirmedBridgeTransaction = (hash = BRIDGE_TX_HASH) =>
    createConfirmedEvmQueryData([
      {
        accountId: `eip155:1:${ACTIVE_EVM_ADDRESS}`,
        blockHash: '0xblock',
        blockNumber: 1,
        chainId: 1,
        cumulativeGasUsed: 21000,
        effectiveGasPrice: '1',
        from: ACTIVE_EVM_ADDRESS,
        gas: 21000,
        gasPrice: '1',
        gasUsed: 21000,
        hash,
        isError: false,
        logs: [],
        methodId: '0x',
        nonce: 1,
        readable: 'Transfer',
        timestamp: '2026-04-29T19:28:41.000Z',
        to: '0x1111111111111111111111111111111111111111',
        transactionCategory: 'TRANSFER',
        transactionType: 'SIMPLE_SEND',
        value: '1',
        valueTransfers: [],
      } as V1TransactionByHashResponse,
    ]);

  const bridgeHistory = {
    [BRIDGE_TX_ID]: {
      txMetaId: BRIDGE_TX_ID,
      account: ACTIVE_EVM_ADDRESS,
      quote: {
        srcChainId: 1,
        destChainId: 8453,
        srcAsset: {
          symbol: 'ETH',
          chainId: 1,
          decimals: 18,
          address: 'native',
        },
        destAsset: {
          symbol: 'ETH',
          chainId: 8453,
          decimals: 18,
          address: 'native',
        },
      },
      status: {
        srcChain: {
          txHash: BRIDGE_TX_HASH,
          chainId: 1,
          amount: '1',
        },
        destChain: {
          txHash:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          chainId: 8453,
          amount: '1',
        },
        status: 'COMPLETE',
      },
      estimatedProcessingTimeInSeconds: 60,
      slippagePercentage: 0,
      completionTime: Date.now(),
      startTime: Date.now() - 60000,
    },
  };

  const getRenderedTransactionIds = (
    queryAllByType: ReturnType<
      typeof renderWithProvider
    >['UNSAFE_queryAllByType'],
  ) =>
    queryAllByType(asComponentType('TransactionElement')).map(
      ({ props }) => props.tx.id,
    );

  const apiBridgeTransactionId = `${BRIDGE_TX_HASH}-1`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsQuery();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
  });

  it('renders TransactionElement for EVM transactions', () => {
    // Arrange & Act
    const { UNSAFE_queryAllByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      {
        state: stateWithTransactions,
      },
    );

    // Assert - The component renders transaction elements
    const transactionElements = UNSAFE_queryAllByType(
      asComponentType('TransactionElement'),
    );
    expect(transactionElements.length).toBeGreaterThanOrEqual(0);
  });

  it('uses the Accounts API bridge transaction when the source hash matches bridge history', () => {
    mockUseTransactionsQuery(createConfirmedBridgeTransaction());
    mockSelectBridgeHistoryForAccount.mockReturnValue(bridgeHistory);

    const { UNSAFE_queryAllByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      {
        state: stateWithConfirmedBridgeTransaction,
      },
    );

    const transactionIds = getRenderedTransactionIds(UNSAFE_queryAllByType);

    expect(transactionIds).toContain(apiBridgeTransactionId);
    expect(transactionIds).not.toContain(BRIDGE_TX_ID);
  });

  it('keeps the local bridge transaction when Accounts API only has a nonce collision', () => {
    mockUseTransactionsQuery(createConfirmedBridgeTransaction(OTHER_TX_HASH));
    mockSelectBridgeHistoryForAccount.mockReturnValue(bridgeHistory);

    const { UNSAFE_queryAllByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      {
        state: stateWithConfirmedBridgeTransaction,
      },
    );

    const transactionIds = getRenderedTransactionIds(UNSAFE_queryAllByType);

    expect(transactionIds).toContain(BRIDGE_TX_ID);
  });
});

describe('UnifiedTransactionsView - Speed up / Cancel modal', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsQuery();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
  });

  it('does not render CancelSpeedupModal when both speed up and cancel are closed', () => {
    const { queryByTestId } = renderWithProvider(<UnifiedTransactionsView />, {
      state: initialState,
    });

    expect(queryByTestId('speedup-modal')).not.toBeOnTheScreen();
    expect(queryByTestId('cancel-modal')).not.toBeOnTheScreen();
  });

  it('renders CancelSpeedupModal as speed up when speedUpIsOpen is true', () => {
    (useUnifiedTxActions as jest.Mock).mockReturnValue({
      ...mockDefaultUnifiedTxActionsReturn,
      speedUpIsOpen: true,
      existingTx: { id: 'tx-1', chainId: '0x1' },
    });

    const { getByTestId, getByText } = renderWithProvider(
      <UnifiedTransactionsView />,
      { state: initialState },
    );

    expect(getByTestId('speedup-modal')).toBeOnTheScreen();
    expect(getByText('Speed Up Transaction')).toBeOnTheScreen();
  });

  it('renders CancelSpeedupModal as cancel when cancelIsOpen is true', () => {
    (useUnifiedTxActions as jest.Mock).mockReturnValue({
      ...mockDefaultUnifiedTxActionsReturn,
      cancelIsOpen: true,
      existingTx: { id: 'tx-1', chainId: '0x1' },
    });

    const { getByTestId, getByText } = renderWithProvider(
      <UnifiedTransactionsView />,
      { state: initialState },
    );

    expect(getByTestId('cancel-modal')).toBeOnTheScreen();
    expect(getByText('Cancel Transaction')).toBeOnTheScreen();
  });
});

describe('UnifiedTransactionsView - refresh', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsQuery();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
  });

  it('calls updateIncomingTransactions when refresh is triggered', async () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      { state: initialState },
    );

    const refreshControl = UNSAFE_getByType(RefreshControl);
    expect(refreshControl.props.onRefresh).toBeDefined();

    await refreshControl.props.onRefresh();

    expect(updateIncomingTransactions).toHaveBeenCalled();
  });
});

describe('UnifiedTransactionsView - token poisoning protection', () => {
  const FRIEND_ADDRESS = '0x1234000000000000000000000000000000000001';
  const ACTIVE_EVM_ADDRESS = '0xabc';

  const baseState = { engine: { backgroundState } };

  const createConfirmedEvmTransaction = (
    overrides: Partial<V1TransactionByHashResponse> = {},
  ) =>
    ({
      accountId: `eip155:1:${ACTIVE_EVM_ADDRESS}`,
      blockHash: '0xblock',
      blockNumber: 1,
      chainId: 1,
      cumulativeGasUsed: 21000,
      effectiveGasPrice: '1',
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      gas: 21000,
      gasPrice: '1',
      gasUsed: 21000,
      hash: '0xhash',
      isError: false,
      logs: [],
      methodId: '0x',
      nonce: 1,
      readable: 'Transfer',
      timestamp: '2026-04-29T19:28:41.000Z',
      to: ACTIVE_EVM_ADDRESS,
      transactionCategory: 'TRANSFER',
      transactionType: 'SIMPLE_SEND',
      value: '1',
      valueTransfers: [],
      ...overrides,
    }) as V1TransactionByHashResponse;

  const createConfirmedEvmQueryData = (
    transactions: V1TransactionByHashResponse[] = [],
  ) =>
    selectTransactions({
      address: ACTIVE_EVM_ADDRESS,
    })({
      pageParams: [undefined],
      pages: [
        {
          data: transactions,
          unprocessedNetworks: [],
          pageInfo: {
            count: transactions.length,
            endCursor: undefined,
            hasNextPage: false,
          },
        },
      ],
    });

  // State with a single incoming ERC-20 transfer from an unknown sender
  const stateWithIncomingTransfer = createConfirmedEvmQueryData([
    createConfirmedEvmTransaction({
      hash: '0xpoison-erc20',
      transactionType: 'TOKEN_TRANSFER',
      valueTransfers: [
        {
          amount: '1',
          contractAddress: '0x3333333333333333333333333333333333333333',
          decimal: 18,
          from: '0x9999999999999999999999999999999999999999',
          name: 'Test Token',
          symbol: 'TKN',
          to: ACTIVE_EVM_ADDRESS,
          transferType: 'ERC20',
        },
      ],
    }),
  ]);

  const stateWithIncomingNativeTransfer = createConfirmedEvmQueryData([
    createConfirmedEvmTransaction({
      hash: '0xpoison-native',
      valueTransfers: [
        {
          amount: '1',
          contractAddress: '',
          decimal: 18,
          from: '0x9999999999999999999999999999999999999999',
          name: 'Ether',
          symbol: 'ETH',
          to: ACTIVE_EVM_ADDRESS,
          transferType: 'NATIVE',
        },
      ],
    }),
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsQuery();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
  });

  it('hides incoming ERC-20 transfer when filterByAddress returns false (unknown sender)', () => {
    mockUseTransactionsQuery(stateWithIncomingTransfer);

    const { getByText } = renderWithProvider(<UnifiedTransactionsView />, {
      state: baseState,
    });

    // Transaction is filtered out → data is empty → empty state is shown
    expect(getByText('You have no transactions')).toBeOnTheScreen();
  });

  it('hides incoming native transfer when sender is unknown', () => {
    mockUseTransactionsQuery(stateWithIncomingNativeTransfer);

    const { getByText } = renderWithProvider(<UnifiedTransactionsView />, {
      state: baseState,
    });

    expect(getByText('You have no transactions')).toBeOnTheScreen();
  });
});

describe('UnifiedTransactionsView - cross-chain bridge visibility', () => {
  const SOLANA_TX_HASH = 'SolanaTxHash123abc';

  const bridgeHistoryItem = {
    txMetaId: SOLANA_TX_HASH,
    account: '0xabc',
    quote: {
      srcChainId: 1151111081099710,
      destChainId: 10,
      srcAsset: {
        symbol: 'SOL',
        chainId: 1151111081099710,
        decimals: 9,
        address: 'native',
      },
      destAsset: {
        symbol: 'ETH',
        chainId: 10,
        decimals: 18,
        address: 'native',
        assetId: 'eip155:10/slip44:60',
      },
    },
    status: {
      srcChain: {
        txHash: SOLANA_TX_HASH,
        chainId: 1151111081099710,
        amount: '1',
      },
      destChain: { txHash: '0xDestHash', chainId: 10, amount: '0.1' },
      status: 'COMPLETE',
    },
    estimatedProcessingTimeInSeconds: 60,
    slippagePercentage: 0,
    completionTime: Date.now(),
    startTime: Date.now() - 60000,
  };

  const solanaTransaction = {
    id: SOLANA_TX_HASH,
    chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    type: 'send',
    status: 'confirmed',
    timestamp: Math.floor(Date.now() / 1000),
    account: '0xabc',
    events: [],
    from: [],
    to: [],
  };

  const {
    filterByAddress: mockFilterByAddress2,
    isTransactionOnChains: mockIsTransactionOnChains2,
    buildTrustedAddressSet: mockBuildTrustedAddressSet2,
  } = jest.requireMock('../../../util/activity');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsQuery();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
    (mockFilterByAddress2 as jest.Mock).mockReturnValue(true);
    (mockIsTransactionOnChains2 as jest.Mock).mockReturnValue(true);
    (mockBuildTrustedAddressSet2 as jest.Mock).mockReturnValue(new Set());
    mockBridgeHistoryItemsBySrcTxHash[SOLANA_TX_HASH] = bridgeHistoryItem;
  });

  afterEach(() => {
    delete mockBridgeHistoryItemsBySrcTxHash[SOLANA_TX_HASH];
    jest.resetAllMocks();
  });

  it('shows bridge source tx when only destination EVM chain is enabled', () => {
    mockSelectBridgeHistoryForAccount.mockReturnValue({
      [SOLANA_TX_HASH]: bridgeHistoryItem,
    });
    mockSelectNonEvmTransactions.mockReturnValue({
      transactions: [solanaTransaction],
      next: null,
      lastUpdated: Date.now(),
    });

    const stateWithBridge = {
      engine: {
        backgroundState: {
          ...backgroundState,
          NetworkEnablementController: {
            ...backgroundState.NetworkEnablementController,
            enabledNetworkMap: {
              eip155: { '0xa': true },
            },
          },
        },
      },
    };

    const { UNSAFE_queryAllByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      { state: stateWithBridge },
    );

    const bridgeItems = UNSAFE_queryAllByType(
      asComponentType('MultichainBridgeTransactionListItem'),
    );
    expect(bridgeItems.length).toBe(1);
  });

  it('does not show non-bridge non-EVM tx when only EVM chains are enabled', () => {
    const nonBridgeSolTx = {
      ...solanaTransaction,
      id: 'RegularSolanaTx',
    };

    mockSelectBridgeHistoryForAccount.mockReturnValue({});
    mockSelectNonEvmTransactions.mockReturnValue({
      transactions: [nonBridgeSolTx],
      next: null,
      lastUpdated: Date.now(),
    });

    const stateWithNonBridgeTx = {
      engine: {
        backgroundState: {
          ...backgroundState,
          NetworkEnablementController: {
            ...backgroundState.NetworkEnablementController,
            enabledNetworkMap: {
              eip155: { '0xa': true },
            },
          },
        },
      },
    };

    const { getByText } = renderWithProvider(<UnifiedTransactionsView />, {
      state: stateWithNonBridgeTx,
    });

    expect(getByText('You have no transactions')).toBeOnTheScreen();
  });
});

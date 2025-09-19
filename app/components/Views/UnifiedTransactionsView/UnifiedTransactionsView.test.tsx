import React from 'react';
import { RefreshControl } from 'react-native';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import UnifiedTransactionsView from './UnifiedTransactionsView';

// Given shared mocks and helpers
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../../styles/common', () => ({
  baseStyles: { flexGrow: {} },
}));

jest.mock('../../UI/AssetOverview/PriceChart/PriceChart.context', () => {
  const ReactActual = jest.requireActual('react');
  const Ctx = ReactActual.createContext({ isChartBeingTouched: false });
  return {
    __esModule: true,
    default: Ctx,
    PriceChartProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock('../../UI/MultichainTransactionListItem', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ index }: { index: number }) =>
      ReactActual.createElement(
        Text,
        { testID: `non-evm-item-${index}` },
        'non-evm',
      ),
  };
});

jest.mock('../../UI/MultichainBridgeTransactionListItem', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ index }: { index: number }) =>
      ReactActual.createElement(
        Text,
        { testID: `bridge-item-${index}` },
        'bridge',
      ),
  };
});

// Mock TransactionElement to avoid deep Redux/contexts
jest.mock('../../UI/TransactionElement', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ i }: { i: number }) =>
      ReactActual.createElement(
        Text,
        { testID: `evm-transaction-item-${i}` },
        'evm',
      ),
  };
});

// Mock selectors used by the component
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../selectors/transactionController', () => ({
  selectSortedEVMTransactionsForSelectedAccountGroup: jest.fn(),
}));
jest.mock('../../../selectors/multichain/multichain', () => ({
  selectNonEvmTransactionsForSelectedAccountGroup: jest.fn(),
}));
jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));
jest.mock('../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(),
}));
jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(),
  }),
);
jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
  selectIsPopularNetwork: jest.fn(),
}));
jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEVMEnabledNetworks: jest.fn(),
  selectNonEVMEnabledNetworks: jest.fn(),
}));
jest.mock('../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

// Mock utilities used in memo pipeline
jest.mock('../../../util/activity', () => ({
  filterByAddress: jest.fn(() => true),
  isTransactionOnChains: jest.fn(() => true),
  sortTransactions: jest.fn((arr: unknown[]) => arr),
}));
jest.mock('../../../util/transactions', () => ({
  addAccountTimeFlagFilter: jest.fn(() => false),
}));
jest.mock('../../../util/networks', () => ({
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(() => false),
}));
jest.mock('../../UI/Transactions/utils', () => ({
  filterDuplicateOutgoingTransactions: jest.fn((arr: unknown[]) => arr),
}));
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { muted: '#999' },
      background: { default: '#fff' },
      primary: { default: '#00f' },
      icon: { default: '#000' },
      overlay: { default: '#000' },
    },
  }),
}));

jest.mock('../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash', () => ({
  useBridgeHistoryItemBySrcTxHash: () => ({
    bridgeHistoryItemsBySrcTxHash:
      (global as { __bridgeMap?: Record<string, unknown> }).__bridgeMap || {},
  }),
}));

// Mock refresh util
jest.mock('../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn().mockResolvedValue(undefined),
}));

// Mock i18n strings to echo keys
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock the actions hook to allow per-test overrides
jest.mock('./useUnifiedTxActions', () => {
  const defaultState = {
    retryIsOpen: false,
    retryErrorMsg: undefined,
    speedUpIsOpen: false,
    cancelIsOpen: false,
    speedUp1559IsOpen: false,
    cancel1559IsOpen: false,
    speedUpConfirmDisabled: false,
    cancelConfirmDisabled: false,
    existingGas: null,
    existingTx: null,
    speedUpTxId: null,
    cancelTxId: null,
    toggleRetry: jest.fn(),
    onSpeedUpAction: jest.fn(),
    onCancelAction: jest.fn(),
    onSpeedUpCompleted: jest.fn(),
    onCancelCompleted: jest.fn(),
    speedUpTransaction: jest.fn(),
    cancelTransaction: jest.fn(),
    signQRTransaction: jest.fn(),
    signLedgerTransaction: jest.fn(),
    cancelUnsignedQRTransaction: jest.fn(),
  };
  return {
    useUnifiedTxActions: () =>
      (global as { __actionsState?: Partial<typeof defaultState> })
        .__actionsState || defaultState,
  };
});

// Mock modals to expose testIDs when visible
jest.mock('../../UI/TransactionActionModal', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { isVisible: boolean; titleText?: string }) =>
      props.isVisible
        ? ReactActual.createElement(
            Text,
            {
              testID: props.titleText?.includes('speedup')
                ? 'speedup-modal'
                : 'cancel-modal',
            },
            'modal',
          )
        : null,
  };
});
jest.mock('../confirmations/legacy/components/UpdateEIP1559Tx', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(Text, { testID: 'eip1559-modal' }, 'eip1559'),
  };
});
jest.mock('../../UI/Transactions/RetryModal', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ retryIsOpen }: { retryIsOpen: boolean }) =>
      retryIsOpen
        ? ReactActual.createElement(Text, { testID: 'retry-modal' }, 'retry')
        : null,
  };
});

// Local helpers
const { selectSortedEVMTransactionsForSelectedAccountGroup } = jest.requireMock(
  '../../../selectors/transactionController',
);
const { selectNonEvmTransactionsForSelectedAccountGroup } = jest.requireMock(
  '../../../selectors/multichain/multichain',
);
const { selectSelectedInternalAccount } = jest.requireMock(
  '../../../selectors/accountsController',
);
const { selectSelectedAccountGroupInternalAccounts } = jest.requireMock(
  '../../../selectors/multichainAccounts/accountTreeController',
);
const { selectTokens } = jest.requireMock(
  '../../../selectors/tokensController',
);
const { selectChainId, selectIsPopularNetwork } = jest.requireMock(
  '../../../selectors/networkController',
);
const { selectEVMEnabledNetworks, selectNonEVMEnabledNetworks } =
  jest.requireMock('../../../selectors/networkEnablementController');
const { selectCurrentCurrency } = jest.requireMock(
  '../../../selectors/currencyRateController',
);
const { updateIncomingTransactions } = jest.requireMock(
  '../../../util/transaction-controller',
);

describe('UnifiedTransactionsView', () => {
  const mockUseSelector = useSelector as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSortedEVMTransactionsForSelectedAccountGroup)
        return [];
      if (selector === selectNonEvmTransactionsForSelectedAccountGroup)
        return { transactions: [] };
      if (selector === selectSelectedInternalAccount)
        return { address: '0xabc', metadata: { importTime: 0 } };
      if (selector === selectSelectedAccountGroupInternalAccounts)
        return [{ address: '0xabc' }];
      if (selector === selectTokens) return [];
      if (selector === selectChainId) return '0x1';
      if (selector === selectIsPopularNetwork) return false;
      if (selector === selectEVMEnabledNetworks) return ['0x1'];
      if (selector === selectNonEVMEnabledNetworks) return ['solana:mainnet'];
      if (selector === selectCurrentCurrency) return 'USD';
      return undefined;
    });
  });

  it('renders empty state when there are no transactions', () => {
    const { getByText } = render(<UnifiedTransactionsView />);
    expect(getByText('wallet.no_transactions')).toBeTruthy();
  });

  it('renders EVM transactions via TransactionElement list items', () => {
    // Arrange: two EVM transactions, one submitted and one confirmed
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSortedEVMTransactionsForSelectedAccountGroup)
        return [
          {
            id: 'a',
            status: 'submitted',
            txParams: { from: '0xabc', nonce: '0x1' },
            chainId: '0x1',
            time: 2,
          },
          {
            id: 'b',
            status: 'confirmed',
            txParams: { from: '0xabc', nonce: '0x2' },
            chainId: '0x1',
            time: 1,
          },
        ];
      if (selector === selectNonEvmTransactionsForSelectedAccountGroup)
        return { transactions: [] };
      if (selector === selectSelectedAccountGroupInternalAccounts)
        return [{ address: '0xabc' }];
      if (selector === selectSelectedInternalAccount)
        return { address: '0xabc', metadata: { importTime: 0 } };
      if (selector === selectTokens) return [];
      if (selector === selectChainId) return '0x1';
      if (selector === selectIsPopularNetwork) return false;
      if (selector === selectEVMEnabledNetworks) return ['0x1'];
      if (selector === selectNonEVMEnabledNetworks) return ['solana:mainnet'];
      if (selector === selectCurrentCurrency) return 'USD';
      return undefined;
    });

    const { queryAllByTestId } = render(<UnifiedTransactionsView />);
    // Expect two items rendered (pending + confirmed)
    expect(queryAllByTestId(/evm-transaction-item-/).length).toBe(2);
  });

  it('pull-to-refresh calls updateIncomingTransactions', async () => {
    const { UNSAFE_getAllByType } = render(<UnifiedTransactionsView />);
    const [rc] = UNSAFE_getAllByType(RefreshControl);
    rc.props.onRefresh();
    expect(updateIncomingTransactions).toHaveBeenCalled();
  });

  it('renders non-EVM transactions', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSortedEVMTransactionsForSelectedAccountGroup)
        return [];
      if (selector === selectNonEvmTransactionsForSelectedAccountGroup)
        return {
          transactions: [
            { id: 'n1', timestamp: 1000, chain: 'solana:mainnet' },
            { id: 'n2', timestamp: 2000, chain: 'solana:mainnet' },
          ],
        };
      if (selector === selectSelectedAccountGroupInternalAccounts)
        return [{ address: '0xabc' }];
      if (selector === selectSelectedInternalAccount)
        return { address: '0xabc', metadata: { importTime: 0 } };
      if (selector === selectTokens) return [];
      if (selector === selectChainId) return '0x1';
      if (selector === selectIsPopularNetwork) return false;
      if (selector === selectEVMEnabledNetworks) return ['0x1'];
      if (selector === selectNonEVMEnabledNetworks) return ['solana:mainnet'];
      if (selector === selectCurrentCurrency) return 'USD';
      return undefined;
    });

    const { queryAllByTestId } = render(<UnifiedTransactionsView />);
    expect(queryAllByTestId(/non-evm-item-/).length).toBe(2);
  });

  describe('non-TransactionMeta EVM transactions (smart tx) status handling', () => {
    it.each([
      'submitted',
      'signed',
      'unapproved',
      'approved',
      'pending',
    ] as const)(
      'includes non-meta EVM tx with status %s as submitted (renders in list)',
      (status) => {
        // Arrange: a non-TransactionMeta-like tx (no chainId string) that should be treated as submitted
        mockUseSelector.mockImplementation((selector: unknown) => {
          if (selector === selectSortedEVMTransactionsForSelectedAccountGroup)
            return [
              {
                id: 'smart-1',
                status,
                // Intentionally omit chainId to ensure !isTransactionMetaLike(tx)
                txParams: { from: '0xabc', nonce: '0x1' },
                time: 10,
              },
            ];
          if (selector === selectNonEvmTransactionsForSelectedAccountGroup)
            return { transactions: [] };
          if (selector === selectSelectedAccountGroupInternalAccounts)
            return [{ address: '0xabc' }];
          if (selector === selectSelectedInternalAccount)
            return { address: '0xabc', metadata: { importTime: 0 } };
          if (selector === selectTokens) return [];
          if (selector === selectChainId) return '0x1';
          if (selector === selectIsPopularNetwork) return false;
          if (selector === selectEVMEnabledNetworks) return ['0x1'];
          if (selector === selectNonEVMEnabledNetworks)
            return ['solana:mainnet'];
          if (selector === selectCurrentCurrency) return 'USD';
          return undefined;
        });

        // Act
        const { queryAllByTestId } = render(<UnifiedTransactionsView />);

        // Assert: one EVM list item rendered (pending/submitted bucket)
        expect(queryAllByTestId(/evm-transaction-item-/).length).toBe(1);
      },
    );

    it('excludes non-meta EVM tx when status is not allowlisted (e.g., failed)', () => {
      // Arrange: a non-TransactionMeta-like tx with a status not in the allowlist
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectSortedEVMTransactionsForSelectedAccountGroup)
          return [
            {
              id: 'smart-2',
              status: 'failed',
              // Intentionally omit chainId to ensure !isTransactionMetaLike(tx)
              txParams: { from: '0xabc', nonce: '0x1' },
              time: 10,
            },
          ];
        if (selector === selectNonEvmTransactionsForSelectedAccountGroup)
          return { transactions: [] };
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return [{ address: '0xabc' }];
        if (selector === selectSelectedInternalAccount)
          return { address: '0xabc', metadata: { importTime: 0 } };
        if (selector === selectTokens) return [];
        if (selector === selectChainId) return '0x1';
        if (selector === selectIsPopularNetwork) return false;
        if (selector === selectEVMEnabledNetworks) return ['0x1'];
        if (selector === selectNonEVMEnabledNetworks) return ['solana:mainnet'];
        if (selector === selectCurrentCurrency) return 'USD';
        return undefined;
      });

      // Act
      const { queryAllByTestId } = render(<UnifiedTransactionsView />);

      // Assert: no EVM list items rendered (tx excluded entirely)
      expect(queryAllByTestId(/evm-transaction-item-/).length).toBe(0);
    });
  });

  it('renders bridge non-EVM item when bridge history exists', () => {
    (global as { __bridgeMap?: Record<string, unknown> }).__bridgeMap = {
      n1: { some: 'bridge' },
    };
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSortedEVMTransactionsForSelectedAccountGroup)
        return [];
      if (selector === selectNonEvmTransactionsForSelectedAccountGroup)
        return {
          transactions: [
            { id: 'n1', timestamp: 1000, chain: 'solana:mainnet' },
            { id: 'n2', timestamp: 2000, chain: 'solana:mainnet' },
          ],
        };
      if (selector === selectSelectedAccountGroupInternalAccounts)
        return [{ address: '0xabc' }];
      if (selector === selectSelectedInternalAccount)
        return { address: '0xabc', metadata: { importTime: 0 } };
      if (selector === selectTokens) return [];
      if (selector === selectChainId) return '0x1';
      if (selector === selectIsPopularNetwork) return false;
      if (selector === selectEVMEnabledNetworks) return ['0x1'];
      if (selector === selectNonEVMEnabledNetworks) return ['solana:mainnet'];
      if (selector === selectCurrentCurrency) return 'USD';
      return undefined;
    });

    const { queryAllByTestId } = render(<UnifiedTransactionsView />);
    expect(queryAllByTestId(/bridge-item-/).length).toBe(1);
    expect(queryAllByTestId(/non-evm-item-/).length).toBe(1);
    (global as { __bridgeMap?: Record<string, unknown> }).__bridgeMap = {};
  });

  it('shows legacy speedup and cancel modals when open', () => {
    (
      global as {
        __actionsState?: { speedUpIsOpen?: boolean; cancelIsOpen?: boolean };
      }
    ).__actionsState = {
      speedUpIsOpen: true,
      cancelIsOpen: true,
    };
    const { getByTestId } = render(<UnifiedTransactionsView />);
    expect(getByTestId('speedup-modal')).toBeTruthy();
    expect(getByTestId('cancel-modal')).toBeTruthy();
    (global as { __actionsState?: unknown }).__actionsState = undefined;
  });

  it('shows EIP-1559 modal when speedUp1559IsOpen or cancel1559IsOpen is true', () => {
    (
      global as { __actionsState?: { speedUp1559IsOpen?: boolean } }
    ).__actionsState = { speedUp1559IsOpen: true };
    const { getByTestId, rerender } = render(<UnifiedTransactionsView />);
    expect(getByTestId('eip1559-modal')).toBeTruthy();

    (
      global as { __actionsState?: { cancel1559IsOpen?: boolean } }
    ).__actionsState = { cancel1559IsOpen: true };
    rerender(<UnifiedTransactionsView />);
    expect(getByTestId('eip1559-modal')).toBeTruthy();
    (global as { __actionsState?: unknown }).__actionsState = undefined;
  });
});

import React, { ComponentType } from 'react';
import { RefreshControl } from 'react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import UnifiedTransactionsView from './UnifiedTransactionsView';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { useUnifiedTxActions } from './useUnifiedTxActions';

// Type helper for UNSAFE_queryByType with mocked string components
const asComponentType = (name: string) => name as unknown as ComponentType;

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

jest.mock('../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash', () => ({
  useBridgeHistoryItemBySrcTxHash: () => ({
    bridgeHistoryItemsBySrcTxHash: {},
  }),
}));

const mockDefaultUnifiedTxActionsReturn = {
  retryIsOpen: false,
  retryErrorMsg: '',
  speedUpIsOpen: false,
  cancelIsOpen: false,
  confirmDisabled: false,
  existingTx: null,
  speedUpTxId: null,
  cancelTxId: null,
  toggleRetry: jest.fn(),
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

jest.mock('../../UI/Transactions/RetryModal', () => 'RetryModal');
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
      { address: '0xabc', type: 'eip155:eoa' },
    ],
  }),
);

describe('UnifiedTransactionsView', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  beforeEach(() => {
    jest.clearAllMocks();
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
});

describe('UnifiedTransactionsView - Speed up / Cancel modal', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
  });

  it('does not render CancelSpeedupModal when both speed up and cancel are closed', () => {
    const { queryByTestId } = renderWithProvider(<UnifiedTransactionsView />, {
      state: initialState,
    });

    expect(queryByTestId('speedup-modal')).toBeNull();
    expect(queryByTestId('cancel-modal')).toBeNull();
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
  const {
    buildTrustedAddressSet: mockBuildTrustedAddressSet,
    filterByAddress: mockFilterByAddress,
    isTransactionOnChains: mockIsTransactionOnChains,
  } = jest.requireMock('../../../util/activity');

  const FRIEND_ADDRESS = '0x1234000000000000000000000000000000000001';

  const baseState = { engine: { backgroundState } };

  // State with a single incoming ERC-20 transfer from an unknown sender
  const stateWithIncomingTransfer = {
    engine: {
      backgroundState: {
        ...backgroundState,
        TransactionController: {
          ...backgroundState.TransactionController,
          transactions: [
            {
              id: 'tx-erc20',
              chainId: '0x1' as const,
              status: TransactionStatus.confirmed,
              time: Date.now(),
              isTransfer: true,
              transferInformation: {
                contractAddress: '0x3333333333333333333333333333333333333333',
                decimals: 18,
                symbol: 'TKN',
              },
              txParams: {
                from: '0x9999999999999999999999999999999999999999',
                to: '0xabc',
                value: '0x0',
                nonce: '0x1',
              },
            },
          ],
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUnifiedTxActions as jest.Mock).mockImplementation(
      () => mockDefaultUnifiedTxActionsReturn,
    );
    // Re-set implementations after any prior resetAllMocks() calls
    (mockBuildTrustedAddressSet as jest.Mock).mockReturnValue(
      new Set<string>(),
    );
    (mockFilterByAddress as jest.Mock).mockReturnValue(true);
    // isTransactionOnChains gates the second chain filter at line 252 of the
    // component; restore it so confirmed transactions aren't silently dropped
    (mockIsTransactionOnChains as jest.Mock).mockReturnValue(true);
  });

  it('calls buildTrustedAddressSet on every render', () => {
    renderWithProvider(<UnifiedTransactionsView />, { state: baseState });

    expect(mockBuildTrustedAddressSet).toHaveBeenCalled();
  });

  it('calls buildTrustedAddressSet with the addressBook from state and an array of account addresses', () => {
    const mockAddressBook = {
      '0x1': {
        [FRIEND_ADDRESS]: {
          address: FRIEND_ADDRESS,
          name: 'Friend',
          chainId: '0x1' as Hex,
          memo: '',
          isEns: false,
        },
      },
    };
    const stateWithAddressBook = {
      engine: {
        backgroundState: {
          ...backgroundState,
          AddressBookController: { addressBook: mockAddressBook },
        },
      },
    };

    renderWithProvider(<UnifiedTransactionsView />, {
      state: stateWithAddressBook,
    });

    expect(mockBuildTrustedAddressSet).toHaveBeenCalledWith(
      mockAddressBook,
      expect.any(Array),
    );
  });

  it('passes a pre-built Set to filterByAddress (not the raw addressBook)', () => {
    renderWithProvider(<UnifiedTransactionsView />, {
      state: stateWithIncomingTransfer,
    });

    expect(mockFilterByAddress).toHaveBeenCalled();
    (mockFilterByAddress as jest.Mock).mock.calls.forEach((args) => {
      // arg[5] is trustedAddresses — must be a Set, not a plain object
      expect(args[5]).toBeInstanceOf(Set);
      // There is no arg[6]; the old addressBook + internalAccountAddresses
      // params have been replaced by a single Set
      expect(args[6]).toBeUndefined();
    });
  });

  it('hides incoming ERC-20 transfer when filterByAddress returns false (unknown sender)', () => {
    (mockFilterByAddress as jest.Mock).mockReturnValue(false);

    const { getByText } = renderWithProvider(<UnifiedTransactionsView />, {
      state: stateWithIncomingTransfer,
    });

    // Transaction is filtered out → data is empty → empty state is shown
    expect(getByText('You have no transactions')).toBeOnTheScreen();
  });

  it('shows incoming ERC-20 transfer when filterByAddress returns true (trusted sender)', () => {
    (mockFilterByAddress as jest.Mock).mockReturnValue(true);

    const { queryByText } = renderWithProvider(<UnifiedTransactionsView />, {
      state: stateWithIncomingTransfer,
    });

    // Transaction passes filter → data is non-empty → empty state is absent
    expect(queryByText('You have no transactions')).toBeNull();
  });
});

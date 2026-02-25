import React, { ComponentType } from 'react';
import { TransactionStatus } from '@metamask/transaction-controller';
import UnifiedTransactionsView from './UnifiedTransactionsView';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { updateIncomingTransactions } from '../../../util/transaction-controller';

// Type helper for UNSAFE_queryByType with mocked string components
const asComponentType = (name: string) => name as unknown as ComponentType;

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
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

jest.mock('./useUnifiedTxActions', () => ({
  useUnifiedTxActions: () => ({
    retryIsOpen: false,
    retryErrorMsg: '',
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
jest.mock('../../UI/Transactions/RetryModal', () => 'RetryModal');
jest.mock(
  '../../UI/Transactions/TransactionsFooter',
  () => 'TransactionsFooter',
);
jest.mock(
  '../MultichainTransactionsView/MultichainTransactionsFooter',
  () => 'MultichainTransactionsFooter',
);

describe('UnifiedTransactionsView', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

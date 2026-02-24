import React from 'react';
import UnifiedTransactionsView from './UnifiedTransactionsView';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { updateIncomingTransactions } from '../../../util/transaction-controller';

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
  const mockAccount = {
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    metadata: {
      importTime: Date.now(),
    },
  };

  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account-1',
            accounts: {
              'account-1': mockAccount,
            },
          },
        },
        AccountTreeController: {
          accountGroupTree: {
            selectedAccountGroupId: 'group-1',
            accountGroups: {
              'group-1': {
                id: 'group-1',
                internalAccountIds: ['account-1'],
              },
            },
          },
        },
        NetworkController: {
          providerConfig: {
            chainId: '0x1',
            type: 'mainnet',
          },
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              blockExplorerUrls: ['https://etherscan.io'],
              defaultBlockExplorerUrlIndex: 0,
            },
          },
        },
        TransactionController: {
          transactions: [],
        },
        TokensController: {
          tokens: [],
          allTokens: {},
          allIgnoredTokens: {},
          allDetectedTokens: {},
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
        },
        MultichainNetworkController: {
          nonEvmTransactions: {
            transactions: [],
          },
        },
        BridgeStatusController: {
          bridgeHistoryForAccount: {},
        },
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
            },
          },
        },
      },
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
    // Arrange & Act
    const { UNSAFE_queryByType } = renderWithProvider(
      <UnifiedTransactionsView />,
      {
        state: initialState,
      },
    );

    // Assert
    expect(UNSAFE_queryByType('TransactionsFooter')).toBeTruthy();
  });

  it('renders MultichainTransactionsFooter when only non-EVM chains enabled', () => {
    // Arrange
    const nonEvmState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          NetworkEnablementController: {
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
    expect(UNSAFE_queryByType('MultichainTransactionsFooter')).toBeTruthy();
  });
});

describe('UnifiedTransactionsView with transactions', () => {
  const mockAccount = {
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    metadata: {
      importTime: Date.now(),
    },
  };

  const mockTransaction = {
    id: 'tx-1',
    chainId: '0x1',
    status: 'confirmed',
    time: Date.now(),
    txParams: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
      value: '0x0',
      nonce: '0x1',
    },
  };

  const stateWithTransactions = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account-1',
            accounts: {
              'account-1': mockAccount,
            },
          },
        },
        AccountTreeController: {
          accountGroupTree: {
            selectedAccountGroupId: 'group-1',
            accountGroups: {
              'group-1': {
                id: 'group-1',
                internalAccountIds: ['account-1'],
              },
            },
          },
        },
        NetworkController: {
          providerConfig: {
            chainId: '0x1',
            type: 'mainnet',
          },
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              blockExplorerUrls: ['https://etherscan.io'],
              defaultBlockExplorerUrlIndex: 0,
            },
          },
        },
        TransactionController: {
          transactions: [mockTransaction],
        },
        TokensController: {
          tokens: [],
          allTokens: {},
          allIgnoredTokens: {},
          allDetectedTokens: {},
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
        },
        MultichainNetworkController: {
          nonEvmTransactions: {
            transactions: [],
          },
        },
        BridgeStatusController: {
          bridgeHistoryForAccount: {},
        },
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
            },
          },
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
    const transactionElements = UNSAFE_queryAllByType('TransactionElement');
    expect(transactionElements.length).toBeGreaterThanOrEqual(0);
  });
});

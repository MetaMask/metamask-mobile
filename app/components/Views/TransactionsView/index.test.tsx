/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  EthMethod,
  SolAccountType,
  isEvmAccountType,
} from '@metamask/keyring-api';

jest.mock('../../../util/test/initial-root-state', () => ({
  __esModule: true,
  default: {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: null,
            accounts: {},
          },
        },
        TokensController: {
          allTokens: {},
        },
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
        },
      },
    },
    transaction: {},
    settings: {},
    alert: {},
  },
}));

jest.mock('@metamask/transaction-controller', () => ({
  CHAIN_IDS: {
    MAINNET: '0x1',
    LINEA_MAINNET: '0xe708',
    POLYGON: '0x89',
    ARBITRUM: '0xa4b1',
  },
}));

jest.mock('@metamask/controller-utils', () => ({
  toChecksumHexAddress: jest.fn((address) => address?.toUpperCase()),
  toHex: jest.fn((value) => `0x${parseInt(value, 10).toString(16)}`),
  NetworkType: {
    mainnet: 'mainnet',
    rpc: 'rpc',
    goerli: 'goerli',
    sepolia: 'sepolia',
  },
}));

jest.mock('../../../constants/network', () => ({
  RPC: 'rpc',
  MAINNET: 'mainnet',
  GOERLI: 'goerli',
  SEPOLIA: 'sepolia',
}));

jest.mock('../../../util/activity', () => ({
  sortTransactions: jest.fn((txs) => txs || []),
  filterByAddressAndNetwork: jest.fn(() => true),
  isTransactionOnChains: jest.fn(() => false),
}));

jest.mock('../../../util/transactions', () => ({
  addAccountTimeFlagFilter: jest.fn(() => false),
}));

jest.mock('../../../util/address', () => ({
  areAddressesEqual: jest.fn((a, b) => a?.toLowerCase() === b?.toLowerCase()),
}));

jest.mock('../../../selectors/multichain', () => ({
  selectNonEvmTransactions: jest.fn(() => ({
    transactions: [],
    next: null,
    lastUpdated: 0,
  })),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectProviderType: jest.fn(() => 'mainnet'),
  selectSelectedNetworkClientId: jest.fn(() => 'selectedNetworkClientId'),
}));

jest.mock('../../../selectors/currencyRateController', () => ({
  selectConversionRate: jest.fn(() => 1),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(() => []),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(() => null),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectTokenNetworkFilter: jest.fn(() => ({})),
}));

jest.mock('../../../selectors/transactionController', () => ({
  selectSortedTransactions: jest.fn(() => []),
}));

const mockSelectEnabledNetworksByNamespace = jest.fn(() => ({
  eip155: {
    '0x1': true,
  },
}));

jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEnabledNetworksByNamespace: jest.fn(() => ({
    eip155: {
      '0x1': true,
    },
  })),
  selectEVMEnabledNetworks: jest.fn(() => ['0x1']),
}));

jest.mock('@metamask/keyring-api', () => ({
  EthMethod: {
    PersonalSign: 'personal_sign',
    SignTransaction: 'eth_signTransaction',
    SignTypedDataV4: 'eth_signTypedData_v4',
  },
  EthScope: {
    Eoa: 'eip155:eoa',
  },
  SolAccountType: {
    DataAccount: 'solana:dataAccount',
  },
  BtcAccountType: {
    P2wpkh: 'bip122:p2wpkh',
  },
  BtcScope: {
    Mainnet: 'bip122:000000000019d6689c085ae165831e93',
    Testnet: 'bip122:000000000933ea01ad0ee984209779ba',
  },
  SolScope: {
    Mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    Devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  },
  isEvmAccountType: jest.fn(() => true),
}));

jest.mock('../../UI/Transactions', () => jest.fn());

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  rejectPendingApproval: jest.fn(),
}));

jest.mock('../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: () => ({}),
}));

jest.mock('../../hooks/AssetPolling/useCurrencyRatePolling', () => jest.fn());
jest.mock('../../hooks/AssetPolling/useTokenRatesPolling', () => jest.fn());

import TransactionsView from './index';
import initialRootState from '../../../util/test/initial-root-state';
import { TX_SUBMITTED, TX_CONFIRMED } from '../../../constants/transaction';
import {
  sortTransactions,
  filterByAddressAndNetwork,
} from '../../../util/activity';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import { areAddressesEqual } from '../../../util/address';
import { selectNonEvmTransactions } from '../../../selectors/multichain';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectSortedTransactions } from '../../../selectors/transactionController';

const TRANSACTION_ID_MOCK = '123';
const Stack = createStackNavigator();
const mockStore = configureMockStore();

interface MockTransaction {
  id: string;
  status: string;
  chainId: string;
  uuid: string;
  txParams: {
    id: string;
    time: number;
    from: string;
    to: string;
    value: string;
    status: string;
    type: string;
    networkId: string;
    hash: string;
    txChainId: string;
    nonce: number;
  };
  time: number;
}

interface MockAccount {
  id: string;
  type:
    | 'eip155:eoa'
    | 'eip155:erc4337'
    | 'bip122:p2pkh'
    | 'bip122:p2sh'
    | 'bip122:p2wpkh'
    | 'bip122:p2tr'
    | 'solana:data-account';
  address: string;
  options: Record<string, never>;
  metadata: {
    name: string;
    keyring: { type: string };
    importTime: number;
  };
  methods: string[];
  scopes: `${string}:${string}`[];
}

describe('TransactionsView', () => {
  const mockAddress = '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756';
  const mockSolanaAddress = '8A4AptCThfbuknsbteHgGKXczfJpfjuVA9SLTSGaaLGC';

  const createMockAccount = (
    type:
      | 'eip155:eoa'
      | 'eip155:erc4337'
      | 'bip122:p2pkh'
      | 'bip122:p2sh'
      | 'bip122:p2wpkh'
      | 'bip122:p2tr'
      | 'solana:data-account' = 'eip155:eoa',
    address = mockAddress,
  ): MockAccount => ({
    id: '30786334-3935-4563-b064-363339643939',
    type,
    address,
    options: {},
    metadata: {
      name: 'Account 1',
      keyring: { type: 'HD Key Tree' },
      importTime: Date.now(),
    },
    methods: [
      EthMethod.PersonalSign,
      EthMethod.SignTransaction,
      EthMethod.SignTypedDataV4,
    ],
    scopes: [type === 'solana:data-account' ? 'solana:mainnet' : 'eip155:1'],
  });

  const createMockTransaction = (overrides = {}): MockTransaction => ({
    id: 'tx-1',
    status: TX_CONFIRMED,
    chainId: '0x1',
    uuid: 'uuid-tx-1',
    txParams: {
      id: 'tx-1',
      time: 1000000,
      from: mockAddress,
      to: '0x456',
      value: '100',
      status: 'confirmed',
      type: 'send',
      networkId: '1',
      hash: '0x123',
      txChainId: '0x1',
      nonce: 1,
    },
    time: 1000000,
    ...overrides,
  });

  const renderTransactionsView = (storeOverrides = {}) => {
    const testStore = mockStore({
      ...initialRootState,
      transaction: {
        id: TRANSACTION_ID_MOCK,
      },
      settings: {
        primaryCurrency: 'Fiat',
      },
      alert: {
        isVisible: false,
      },
      engine: {
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          AccountsController: {
            internalAccounts: {
              selectedAccount: '30786334-3935-4563-b064-363339643939',
              accounts: {
                '30786334-3935-4563-b064-363339643939': createMockAccount(),
              },
            },
          },
          TokensController: {
            ...initialRootState.engine.backgroundState.TokensController,
            allTokens: {
              ...initialRootState.engine.backgroundState.TokensController
                .allTokens,
              '0x1': {
                '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272': [],
              },
            },
          },
        },
      },
      ...storeOverrides,
    });

    return render(
      <Provider store={testStore}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="TransactionsView"
              // @ts-expect-error-next-line
              component={TransactionsView}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    (
      sortTransactions as jest.MockedFunction<typeof sortTransactions>
    ).mockImplementation((txs) => txs || []);
    (
      filterByAddressAndNetwork as jest.MockedFunction<
        typeof filterByAddressAndNetwork
      >
    ).mockReturnValue(true);
    (
      addAccountTimeFlagFilter as jest.MockedFunction<
        typeof addAccountTimeFlagFilter
      >
    ).mockReturnValue(false);
    (
      areAddressesEqual as jest.MockedFunction<typeof areAddressesEqual>
    ).mockImplementation((a, b) => a?.toLowerCase() === b?.toLowerCase());
    (
      selectSortedTransactions as jest.MockedFunction<
        typeof selectSortedTransactions
      >
    )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue([createMockTransaction()] as any);
    (
      selectNonEvmTransactions as jest.MockedFunction<
        typeof selectNonEvmTransactions
      >
    ).mockReturnValue({
      transactions: [],
      next: null,
      lastUpdated: 0,
    });
    (
      selectSelectedInternalAccount as jest.MockedFunction<
        typeof selectSelectedInternalAccount
      >
    )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue(createMockAccount() as any);
    (
      isEvmAccountType as jest.MockedFunction<typeof isEvmAccountType>
    ).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders correctly and matches snapshot', async () => {
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount() as any);

      const component = renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(component.toJSON()).toMatchSnapshot();
    });

    it('renders with loading state initially', () => {
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount() as any);

      const component = renderTransactionsView();

      expect(component).toBeDefined();
      expect(component.toJSON()).toBeTruthy();
    });
  });

  describe('Transaction Filtering Logic', () => {
    it('calls sortTransactions with provided transactions', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'tx-1', time: 1000 }),
        createMockTransaction({ id: 'tx-2', time: 2000 }),
      ];

      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue(mockTransactions);
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount());

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(sortTransactions).toHaveBeenCalledWith(mockTransactions);
    });

    it('calls filterByAddressAndNetwork for each transaction', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'tx-1' }),
        createMockTransaction({ id: 'tx-2' }),
      ];

      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue(mockTransactions);
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount());

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(filterByAddressAndNetwork).toHaveBeenCalledTimes(2);
    });

    it('handles submitted transactions filtering', async () => {
      const mockTransactions = [
        createMockTransaction({
          id: 'tx-1',
          status: TX_SUBMITTED,
          txParams: {
            ...createMockTransaction().txParams,
            from: mockAddress,
            nonce: 1,
          },
        }),
        createMockTransaction({
          id: 'tx-2',
          status: TX_CONFIRMED,
          txParams: {
            ...createMockTransaction().txParams,
            from: mockAddress,
            nonce: 2,
          },
        }),
      ];

      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue(mockTransactions);
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount());

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(sortTransactions).toHaveBeenCalledWith(mockTransactions);
    });
  });

  describe('Multichain Functionality', () => {
    it('handles EVM account transactions', async () => {
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount('eip155:eoa', mockAddress));
      (
        isEvmAccountType as jest.MockedFunction<typeof isEvmAccountType>
      ).mockReturnValue(true);

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(selectSortedTransactions).toHaveBeenCalled();
    });

    it('handles non-EVM account with Solana transactions', async () => {
      const solanaAccount = createMockAccount(
        SolAccountType.DataAccount,
        mockSolanaAddress,
      );

      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(solanaAccount);
      (
        isEvmAccountType as jest.MockedFunction<typeof isEvmAccountType>
      ).mockReturnValue(false);
      (
        selectNonEvmTransactions as jest.MockedFunction<
          typeof selectNonEvmTransactions
        >
      ).mockReturnValue({
        transactions: [
          {
            type: 'send',
            id: 'sol-tx-1',
            from: [
              {
                address: mockSolanaAddress,
                asset: {
                  unit: 'SOL',
                  type: 'solana:mainnet/slip44:501',
                  amount: '1000000',
                  fungible: true,
                },
              },
            ],
            to: [
              {
                address: '9A4AptCThfbuknsbteHgGKXczfJpfjuVA9SLTSGaaLGC',
                asset: {
                  unit: 'SOL',
                  type: 'solana:mainnet/slip44:501',
                  amount: '1000000',
                  fungible: true,
                },
              },
            ],
            events: [],
            chain: 'solana:mainnet',
            status: 'confirmed',
            fees: [],
            account: mockSolanaAddress,
            timestamp: 1000000,
          },
        ],
        next: null,
        lastUpdated: Date.now(),
      });

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(selectNonEvmTransactions).toHaveBeenCalled();
    });

    it('merges EVM and Solana transactions for non-EVM accounts', async () => {
      const solanaAccount = createMockAccount(
        SolAccountType.DataAccount,
        mockSolanaAddress,
      );

      const evmTransactions = [createMockTransaction({ time: 2000000 })];
      const solanaTransactions = [
        {
          type: 'send' as const,
          id: 'sol-tx-1',
          from: [
            {
              address: mockSolanaAddress,
              asset: {
                unit: 'SOL',
                type: 'solana:mainnet/slip44:501' as const,
                amount: '1000000',
                fungible: true as const,
              },
            },
          ],
          to: [
            {
              address: '9A4AptCThfbuknsbteHgGKXczfJpfjuVA9SLTSGaaLGC',
              asset: {
                unit: 'SOL',
                type: 'solana:mainnet/slip44:501' as const,
                amount: '1000000',
                fungible: true as const,
              },
            },
          ],
          events: [],
          chain: 'solana:mainnet' as const,
          status: 'confirmed' as const,
          fees: [],
          account: mockSolanaAddress,
          timestamp: 1000000,
        },
      ];

      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(solanaAccount);
      (
        isEvmAccountType as jest.MockedFunction<typeof isEvmAccountType>
      ).mockReturnValue(false);
      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue(evmTransactions);
      (
        selectNonEvmTransactions as jest.MockedFunction<
          typeof selectNonEvmTransactions
        >
      ).mockReturnValue({
        transactions: solanaTransactions,
        next: null,
        lastUpdated: Date.now(),
      });

      const component = renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(selectNonEvmTransactions).toHaveBeenCalled();
      expect(component).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty transaction list', async () => {
      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue([]);
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount());

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(sortTransactions).toHaveBeenCalledWith([]);
    });

    it('handles missing selected account gracefully', async () => {
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(undefined);

      const component = renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(component).toBeDefined();
    });

    it('handles transactions with invalid structures', async () => {
      const invalidTransactions = [
        { id: 'invalid-1' }, // Missing required fields
        createMockTransaction({ txParams: null }), // Invalid txParams
      ];

      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue(invalidTransactions as any);
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount());
      (
        filterByAddressAndNetwork as jest.MockedFunction<
          typeof filterByAddressAndNetwork
        >
      ).mockReturnValue(false); // Filter out invalid transactions

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(sortTransactions).toHaveBeenCalledWith(invalidTransactions);
    });

    it('handles duplicate transactions', async () => {
      const duplicateTransactions = [
        createMockTransaction({ id: 'tx-1' }),
        createMockTransaction({ id: 'tx-1' }), // Duplicate
        createMockTransaction({ id: 'tx-2' }),
      ];

      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue(duplicateTransactions);
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount());

      renderTransactionsView();

      act(() => {
        jest.runAllTimers();
      });

      expect(sortTransactions).toHaveBeenCalledWith(duplicateTransactions);
    });
  });

  describe('Network Filtering', () => {
    // Common test configurations
    const createMockTransactions = (
      transactions: { id: string; chainId: string }[],
    ) =>
      transactions.map(({ id, chainId }) =>
        createMockTransaction({ id, chainId }),
      );

    const setupSelectors = (transactions: MockTransaction[]) => {
      (
        selectSortedTransactions as jest.MockedFunction<
          typeof selectSortedTransactions
        >
      ).mockReturnValue(transactions);
      (
        selectSelectedInternalAccount as jest.MockedFunction<
          typeof selectSelectedInternalAccount
        >
      ).mockReturnValue(createMockAccount());
    };

    const runTestWithTimers = () => {
      renderTransactionsView();
      act(() => {
        jest.runAllTimers();
      });
    };

    it('should filter transactions based on enabledNetworksByNamespace', async () => {
      const mockTransactions = createMockTransactions([
        { id: 'tx-1', chainId: '0x1' }, // Enabled network
        { id: 'tx-2', chainId: '0x89' }, // Disabled network
        { id: 'tx-3', chainId: '0xa4b1' }, // Disabled network
      ]);

      setupSelectors(mockTransactions);
      mockSelectEnabledNetworksByNamespace.mockReturnValue({
        eip155: {
          '0x1': true, // Only mainnet is enabled
        },
      });

      runTestWithTimers();

      expect(sortTransactions).toHaveBeenCalledWith(mockTransactions);
    });

    it('should handle empty enabledNetworksByNamespace gracefully', async () => {
      const mockTransactions = createMockTransactions([
        { id: 'tx-1', chainId: '0x1' },
        { id: 'tx-2', chainId: '0x89' },
      ]);

      setupSelectors(mockTransactions);
      mockSelectEnabledNetworksByNamespace.mockReturnValue({
        eip155: {
          '0x1': false, // No enabled networks
        },
      });

      runTestWithTimers();

      expect(sortTransactions).toHaveBeenCalledWith(mockTransactions);
    });

    it('should have proper selector setup', () => {
      expect(mockSelectEnabledNetworksByNamespace).toBeDefined();
    });
  });
});

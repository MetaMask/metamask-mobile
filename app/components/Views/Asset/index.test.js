import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Asset from './';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';

// Mock Solana transactions for testing
const mockSolanaTransactions = [
  // Native SOL transaction
  {
    id: 'sol-tx-1',
    time: 1000000,
    from: [
      {
        address: '8A4AptCThfbuknsbteHgGKXczfJpfjuVA9SLTSGaaLGC',
        asset: {
          amount: '0.1',
          fungible: true,
          type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          unit: 'SOL',
        },
      },
    ],
    to: [
      {
        address: 'EMmTjuHsYCYX7vgPcQ2QVbNwYAwcvGoSMCEaHKc19DdE',
        asset: {
          amount: '0.1',
          fungible: true,
          type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          unit: 'SOL',
        },
      },
    ],
  },
  // SPL token transaction (USDC)
  {
    id: 'spl-tx-1',
    time: 2000000,
    from: [
      {
        address: '8A4AptCThfbuknsbteHgGKXczfJpfjuVA9SLTSGaaLGC',
        asset: {
          amount: '100',
          fungible: true,
          type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          unit: 'USDC',
        },
      },
    ],
    to: [
      {
        address: 'EMmTjuHsYCYX7vgPcQ2QVbNwYAwcvGoSMCEaHKc19DdE',
        asset: {
          amount: '100',
          fungible: true,
          type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          unit: 'USDC',
        },
      },
    ],
  },
  // Mixed transaction (swap with SOL + token)
  {
    id: 'mixed-tx-1',
    time: 3000000,
    from: [
      {
        address: 'FQT9SSwEZ6UUQxsmTzgt5JzjrS4M5zm13M1QiYF8TEo6',
        asset: {
          amount: '1',
          fungible: true,
          type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:BQX1cjcRHXmrqNtoFWwmE5bZj7RPneTmqXB979b2pump',
          unit: 'ITALIANROT',
        },
      },
      {
        address: 'FQT9SSwEZ6UUQxsmTzgt5JzjrS4M5zm13M1QiYF8TEo6',
        asset: {
          amount: '0.00203928',
          fungible: true,
          type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          unit: 'SOL',
        },
      },
    ],
    to: [],
  },
  // Transaction with no asset data
  {
    id: 'empty-tx-1',
    time: 4000000,
    from: [],
    to: [],
  },
];

const mockInitialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
  inpageProvider: {
    networkId: '0x1',
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      TokensController: {
        allTokens: {
          '0x1': {
            '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756': [],
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'selectedNetworkClientId',
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'selectedNetworkClientId',
              },
            ],
            defaultRpcEndpointIndex: 0,
            defaultBlockExplorerUrl: 0,
            blockExplorerUrls: ['https://block.com'],
          },
          '0x89': {
            chainId: '0x89',
            rpcEndpoints: [
              {
                networkClientId: 'otherNetworkClientId',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
      TransactionController: {
        transactions: [
          {
            txParams: {
              from: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
              to: '0x0000000000000000000000000000000000000000',
            },
            hash: '0x3148',
            status: 'confirmed',
            chainId: '0x1',
            networkID: '0x1',
            type: TransactionType.simpleSend,
          },
        ],
      },
      MultichainTransactionsController: {
        nonEvmTransactions: {},
      },
    },
  },
};

// Helper to create state with different account types
const createMockStateWithAccount = (accountType = EthAccountType.Eoa) => ({
  ...mockInitialState,
  engine: {
    ...mockInitialState.engine,
    backgroundState: {
      ...mockInitialState.engine.backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          selectedAccount: 'test-selected-account-id',
          accounts: {
            'test-selected-account-id': {
              id: 'test-selected-account-id',
              address: '8A4AptCThfbuknsbteHgGKXczfJpfjuVA9SLTSGaaLGC',
              type: accountType,
              options: {},
              methods: [],
              metadata: {
                name: 'Test Account',
                keyring: { type: 'HD Key Tree' },
              },
            },
          },
        },
      },
      MultichainTransactionsController: {
        nonEvmTransactions: {
          'test-selected-account-id': {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              transactions: mockSolanaTransactions,
              next: null,
              lastUpdated: Date.now(),
            },
          },
        },
      },
    },
  },
});

jest.unmock('react-native/Libraries/Interaction/InteractionManager');

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  getBuildNumber: jest.fn().mockReturnValue(1),
}));

jest.mock('../../../core/Engine', () => {
  const {
    MOCK_ADDRESS_1,
  } = require('../../../util/test/accountsControllerTestUtils');

  return {
    context: {
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1],
            },
          ],
        },
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  };
});

jest.mock('../../../components/UI/Stake/sdk/stakeSdkProvider', () => ({
  earnApiService: {
    pooledStaking: {
      getStakingBalance: jest.fn().mockResolvedValue('0'),
      getStakingPositions: jest.fn().mockResolvedValue([]),
    },
    lending: {
      getLendingBalance: jest.fn().mockResolvedValue('0'),
      getLendingPositions: jest.fn().mockResolvedValue([]),
    },
  },
  stakingApiService: {
    getStakingBalance: jest.fn().mockResolvedValue('0'),
    getStakingPositions: jest.fn().mockResolvedValue([]),
  },
  lendingApiService: {
    getLendingBalance: jest.fn().mockResolvedValue('0'),
    getLendingPositions: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../selectors/earnController', () => ({
  ...jest.requireActual('../../../selectors/earnController'),
  earnSelectors: {
    ...jest.requireActual('../../../selectors/earnController').earnSelectors,
    selectEarnTokenPair: jest.fn().mockReturnValue({
      earnToken: undefined,
      outputToken: undefined,
    }),
  },
}));

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => false,
  }),
);

describe('Asset', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'ETH',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call navigation.setOptions on mount', () => {
    const mockSetOptions = jest.fn();
    renderWithProvider(
      <Asset
        navigation={{ setOptions: mockSetOptions }}
        route={{
          params: {
            symbol: 'BNB',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
        transactions={[]}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('should display swaps button if the asset is allowed', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'ETH',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should not display swaps button if the asset is not allowed', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'AVAX',
            address: 'something',
            isETH: false,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  describe('Multichain Functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render EVM assets with Transactions component', () => {
      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'ETH',
                address: '0x0000000000000000000000000000000000000000',
                isETH: true,
                chainId: '0x1', // EVM chain
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        {
          state: createMockStateWithAccount(EthAccountType.Eoa),
        },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          isETH: true,
          chainId: '0x1',
        },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render non-EVM assets with MultichainTransactionsView', () => {
      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'SOL',
                address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
                isNative: true,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Solana chain
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        {
          state: createMockStateWithAccount(SolAccountType.DataAccount),
        },
        {
          symbol: 'SOL',
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          isNative: true,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should filter native SOL transactions correctly', () => {
      const testState = createMockStateWithAccount(SolAccountType.DataAccount);

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'SOL',
                address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
                isNative: true,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: testState },
        {
          symbol: 'SOL',
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          isNative: true,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );

      // Should render only pure SOL transactions, not mixed ones
      expect(toJSON()).toMatchSnapshot();
    });

    it('should filter SPL token transactions correctly', () => {
      const testState = createMockStateWithAccount(SolAccountType.DataAccount);

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'USDC',
                address:
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                isNative: false,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: testState },
        {
          symbol: 'USDC',
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          isNative: false,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );

      // Should render only USDC transactions
      expect(toJSON()).toMatchSnapshot();
    });

    it('should exclude transactions with empty asset data', () => {
      const testState = createMockStateWithAccount(SolAccountType.DataAccount);

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'SOL',
                address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
                isNative: true,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: testState },
        {
          symbol: 'SOL',
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          isNative: true,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );

      // Should not include empty transactions (empty-tx-1)
      expect(toJSON()).toMatchSnapshot();
    });

    it('should exclude mixed token/SOL transactions from native SOL view', () => {
      const testState = createMockStateWithAccount(SolAccountType.DataAccount);

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'SOL',
                address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
                isNative: true,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: testState },
        {
          symbol: 'SOL',
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          isNative: true,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );

      // Should not include mixed-tx-1 (ITALIANROT + SOL)
      expect(toJSON()).toMatchSnapshot();
    });

    it('should handle unknown SPL token filtering gracefully', () => {
      const testState = createMockStateWithAccount(SolAccountType.DataAccount);

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'UNKNOWN',
                address:
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:UnknownTokenAddress',
                isNative: false,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: testState },
        {
          symbol: 'UNKNOWN',
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:UnknownTokenAddress',
          isNative: false,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );

      // Should render empty state for unknown tokens
      expect(toJSON()).toMatchSnapshot();
    });

    it('should sort filtered transactions by time descending', () => {
      const testState = createMockStateWithAccount(SolAccountType.DataAccount);

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'SOL',
                address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
                isNative: true,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: testState },
        {
          symbol: 'SOL',
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          isNative: true,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );

      // Transactions should be sorted by time (newest first)
      expect(toJSON()).toMatchSnapshot();
    });

    it('should use EVM transactions for EVM account types', () => {
      const testState = createMockStateWithAccount(EthAccountType.Eoa);

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'ETH',
                address: '0x0000000000000000000000000000000000000000',
                isETH: true,
                chainId: '0x1',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: testState },
        {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          isETH: true,
          chainId: '0x1',
        },
      );

      // Should use EVM transactions even if multichain data exists
      expect(toJSON()).toMatchSnapshot();
    });

    it('should handle state with no multichain transactions', () => {
      const stateWithoutMultichain = {
        ...createMockStateWithAccount(SolAccountType.DataAccount),
        engine: {
          ...createMockStateWithAccount(SolAccountType.DataAccount).engine,
          backgroundState: {
            ...createMockStateWithAccount(SolAccountType.DataAccount).engine
              .backgroundState,
            MultichainTransactionsController: {
              nonEvmTransactions: {
                'test-selected-account-id': {
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
                    transactions: [],
                    next: null,
                    lastUpdated: Date.now(),
                  },
                },
              },
            },
          },
        },
      };

      const { toJSON } = renderScreen(
        (props) => (
          <Asset
            {...props}
            route={{
              params: {
                symbol: 'SOL',
                address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
                isNative: true,
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              },
            }}
          />
        ),
        {
          name: 'Asset',
        },
        { state: stateWithoutMultichain },
        {
          symbol: 'SOL',
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          isNative: true,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Fund Button Visibility', () => {
    it('should show fund button when only ramp is supported (ETH)', () => {
      const state = {
        ...mockInitialState,
        fiatOrders: {
          networks: [
            {
              active: true,
              chainId: '1',
              chainName: 'Ethereum Mainnet',
              nativeTokenSupported: true,
            },
          ],
        },
        // No deposit support
        remoteFeatureFlags: {
          depositConfig: {
            active: false,
            minimumVersion: '7.0.0',
          },
        },
      };

      const { toJSON } = renderWithProvider(
        <Asset
          navigation={{ setOptions: jest.fn() }}
          route={{
            params: {
              symbol: 'ETH',
              address: 'something',
              isETH: true,
              chainId: '0x1',
            },
          }}
        />,
        { state },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should show fund button when only deposit is supported', () => {
      const state = {
        ...mockInitialState,
        fiatOrders: {
          networks: [
            {
              active: false,
              chainId: '1',
              chainName: 'Ethereum Mainnet',
              nativeTokenSupported: false,
            },
          ],
        },
        // Deposit is supported
        remoteFeatureFlags: {
          depositConfig: {
            active: true,
            minimumVersion: '1.0.0',
          },
        },
      };

      const { toJSON } = renderWithProvider(
        <Asset
          navigation={{ setOptions: jest.fn() }}
          route={{
            params: {
              symbol: 'ETH',
              address: 'something',
              isETH: true,
              chainId: '0x1',
            },
          }}
        />,
        { state },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should show fund button when both deposit and ramp are supported', () => {
      const state = {
        ...mockInitialState,
        fiatOrders: {
          networks: [
            {
              active: true,
              chainId: '1',
              chainName: 'Ethereum Mainnet',
              nativeTokenSupported: true,
            },
          ],
        },
        // Both deposit and ramp are supported
        remoteFeatureFlags: {
          depositConfig: {
            active: true,
            minimumVersion: '1.0.0',
          },
        },
      };

      const { toJSON } = renderWithProvider(
        <Asset
          navigation={{ setOptions: jest.fn() }}
          route={{
            params: {
              symbol: 'ETH',
              address: 'something',
              isETH: true,
              chainId: '0x1',
            },
          }}
        />,
        { state },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should hide fund button when neither deposit nor ramp are supported', () => {
      const state = {
        ...mockInitialState,
        fiatOrders: {
          networks: [
            {
              active: false,
              chainId: '1',
              chainName: 'Ethereum Mainnet',
              nativeTokenSupported: false,
            },
          ],
        },
        // No deposit support
        remoteFeatureFlags: {
          depositConfig: {
            active: false,
            minimumVersion: '7.0.0',
          },
        },
      };

      const { toJSON } = renderWithProvider(
        <Asset
          navigation={{ setOptions: jest.fn() }}
          route={{
            params: {
              symbol: 'ETH',
              address: 'something',
              isETH: true,
              chainId: '0x1',
            },
          }}
        />,
        { state },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should show fund button for non-ETH tokens when ramp is supported', () => {
      const state = {
        ...mockInitialState,
        fiatOrders: {
          networks: [
            {
              active: true,
              chainId: '1',
              chainName: 'Ethereum Mainnet',
              nativeTokenSupported: false,
            },
          ],
        },
        remoteFeatureFlags: {
          depositConfig: {
            active: false,
            minimumVersion: '7.0.0',
          },
        },
      };

      const { toJSON } = renderWithProvider(
        <Asset
          navigation={{ setOptions: jest.fn() }}
          route={{
            params: {
              symbol: 'USDC',
              address: '0xa0b86a33e6776a1a1b6e6bdb9b3b5e6b2e6f6d8e',
              isETH: false,
              chainId: '0x1',
            },
          }}
        />,
        { state },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should show fund button for non-ETH tokens when deposit is supported', () => {
      const state = {
        ...mockInitialState,
        fiatOrders: {
          networks: [
            {
              active: false,
              chainId: '1',
              chainName: 'Ethereum Mainnet',
              nativeTokenSupported: false,
            },
          ],
        },
        remoteFeatureFlags: {
          depositConfig: {
            active: true,
            minimumVersion: '1.0.0',
          },
        },
      };

      const { toJSON } = renderWithProvider(
        <Asset
          navigation={{ setOptions: jest.fn() }}
          route={{
            params: {
              symbol: 'USDC',
              address: '0xa0b86a33e6776a1a1b6e6bdb9b3b5e6b2e6f6d8e',
              isETH: false,
              chainId: '0x1',
            },
          }}
        />,
        { state },
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { View } from 'react-native';

import MultichainAddressRowsList from './MultichainAddressRowsList';
import { mockTheme } from '../../../../util/theme';

const mockStore = configureStore([]);

const createMockState = () => ({
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            name: 'Ethereum Mainnet',
            chainId: '0x1',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'infura',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
          },
          '0x89': {
            name: 'Polygon Mainnet',
            chainId: '0x89',
            nativeCurrency: 'MATIC',
            rpcEndpoints: [
              {
                networkClientId: 'polygon',
                type: 'custom',
                url: 'https://polygon-rpc.com',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://polygonscan.com'],
            defaultBlockExplorerUrlIndex: 0,
          },
          '0xa4b1': {
            name: 'Arbitrum One',
            chainId: '0xa4b1',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'arbitrum',
                type: 'custom',
                url: 'https://arb1.arbitrum.io/rpc',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://arbiscan.io'],
            defaultBlockExplorerUrlIndex: 0,
          },
          '0xa': {
            name: 'Optimism',
            chainId: '0xa',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'optimism',
                type: 'custom',
                url: 'https://mainnet.optimism.io',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://optimistic.etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
          },
        },
      },
      MultichainNetworkController: {
        multichainNetworkConfigurationsByChainId: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            name: 'Solana',
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            nativeCurrency:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            isEvm: false,
          },
        },
      },
    },
  },
});

const createMockAccount = (
  id: string,
  address: string,
  scopes: string[],
  name: string,
): InternalAccount => ({
  id,
  address,
  metadata: {
    name,
    importTime: Date.now(),
    keyring: { type: 'HD Key Tree' },
  },
  options: {},
  methods: [],
  type: 'eip155:eoa',
  scopes: scopes as `${string}:${string}`[],
});

const accounts: Record<string, InternalAccount> = {
  ethereum: createMockAccount(
    '1',
    '0x1234567890abcdef1234567890abcdef12345678',
    ['eip155:*'],
    'Ethereum Account',
  ),
  polygon: createMockAccount(
    '2',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    ['eip155:137'],
    'Polygon Account',
  ),
  solana: createMockAccount(
    '3',
    'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
    ['solana:*'],
    'Solana Account',
  ),
  bitcoin: createMockAccount(
    '4',
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ['bip122:*'],
    'Bitcoin Account',
  ),
};

const MultichainAddressRowsListMeta = {
  title: 'Component Library / MultichainAccounts / MultichainAddressRowsList',
  component: MultichainAddressRowsList,
  argTypes: {
    accounts: {
      control: 'object',
      description: 'Array of InternalAccount objects',
    },
  },
};

export default MultichainAddressRowsListMeta;

export const MultipleDifferentAccounts = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [accounts.ethereum, accounts.solana, accounts.bitcoin],
  },
};

export const SingleEthereumAccount = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [accounts.ethereum],
  },
};

export const SpecificNetworkAccount = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [accounts.polygon],
  },
};

export const SolanaOnly = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [accounts.solana],
  },
};

export const EmptyState = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [],
  },
};

export const MixedAccountTypes = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [accounts.ethereum, accounts.polygon, accounts.solana],
  },
};

export const LargeAccountSet = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [
      createMockAccount(
        'large1',
        '0x1111111111111111111111111111111111111111',
        ['eip155:*'],
        'Large Test 1',
      ),
      createMockAccount(
        'large2',
        '0x2222222222222222222222222222222222222222',
        ['eip155:*'],
        'Large Test 2',
      ),
      createMockAccount(
        'large3',
        '0x3333333333333333333333333333333333333333',
        ['eip155:*'],
        'Large Test 3',
      ),
      createMockAccount(
        'large4',
        '0x4444444444444444444444444444444444444444',
        ['eip155:1'],
        'Ethereum Only',
      ),
      createMockAccount(
        'large5',
        '0x5555555555555555555555555555555555555555',
        ['eip155:137'],
        'Polygon Only',
      ),
      accounts.solana,
      accounts.bitcoin,
    ],
  },
};

export const AccountsWithLongAddresses = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [
      createMockAccount(
        'long1',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        ['eip155:*'],
        'Very Long Address Account',
      ),
      createMockAccount(
        'long2',
        'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hyVeryLongSolanaAddress',
        ['solana:*'],
        'Long Solana Account',
      ),
    ],
  },
};

export const CustomNetworkAccounts = {
  render: (args: { accounts: InternalAccount[] }) => (
    <Provider store={mockStore(createMockState())}>
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: mockTheme.colors.background.default,
        }}
      >
        <MultichainAddressRowsList accounts={args.accounts} />
      </View>
    </Provider>
  ),
  args: {
    accounts: [
      createMockAccount(
        'custom1',
        '0x1234567890abcdef1234567890abcdef12345678',
        ['eip155:42161'],
        'Arbitrum Account',
      ),
      createMockAccount(
        'custom2',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        ['eip155:10'],
        'Optimism Account',
      ),
    ],
  },
};

import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AccountGroupType, AccountGroupId } from '@metamask/account-api';
import { Box } from '@metamask/design-system-react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Caip25EndowmentPermissionName,
  Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';

import MultichainAccountConnect from './MultichainAccountConnect';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts.type';
import { AccountConnectProps } from '../../AccountConnect/AccountConnect.types';
import { ToastContextWrapper } from '../../../../component-library/components/Toast';

const Stack = createStackNavigator();

const createMockInternalAccount = (
  id: string,
  name: string,
  address: string,
): InternalAccount => ({
  id,
  address,
  type: 'eip155:eoa',
  scopes: ['eip155:1', 'eip155:137'],
  options: {},
  methods: ['personal_sign', 'eth_sign', 'eth_signTypedData_v4'],
  metadata: {
    name,
    keyring: { type: 'simple' },
    importTime: Date.now(),
  },
});

const createMockAccountGroupWithInternalAccounts = (
  id: string,
  name: string,
  accountId: string,
  address: string,
): AccountGroupWithInternalAccounts => ({
  id: id as AccountGroupId,
  type: AccountGroupType.SingleAccount,
  metadata: {
    name,
    pinned: false,
    hidden: false,
  },
  accounts: [createMockInternalAccount(accountId, name, address)],
});

const mockAccountGroup1 = createMockAccountGroupWithInternalAccounts(
  'test-group1',
  'Account 1',
  'account-id-1',
  '0x1234567890123456789012345678901234567890',
);

const mockAccountGroup2 = createMockAccountGroupWithInternalAccounts(
  'test-group2',
  'Account 2',
  'account-id-2',
  '0x2345678901234567890123456789012345678901',
);

const mockAccountGroup3 = createMockAccountGroupWithInternalAccounts(
  'test-group3',
  'Account 3',
  'account-id-3',
  '0x3456789012345678901234567890123456789012',
);

const mockAccountGroups: AccountGroupWithInternalAccounts[] = [
  mockAccountGroup1,
  mockAccountGroup2,
  mockAccountGroup3,
];

// Mock network configurations
const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io'],
  },
  'eip155:137': {
    chainId: '0x89',
    name: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  'eip155:56': {
    chainId: '0x38',
    name: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
  },
} as const;

// Mock host info for different scenarios
const createMockHostInfo = (origin: string, isEip1193Request = false) => ({
  metadata: {
    origin,
    id: 'test-dapp-id',
    isEip1193Request,
  },
  permissions: {
    [Caip25EndowmentPermissionName]: {
      parentCapability: Caip25EndowmentPermissionName,
      caveats: [
        {
          type: 'caip25',
          value: {
            requiredScopes: {},
            optionalScopes: {
              'eip155:1': {
                methods: ['eth_sendTransaction', 'personal_sign'],
                notifications: ['accountsChanged', 'chainChanged'],
                accounts: [],
              },
              'eip155:137': {
                methods: ['eth_sendTransaction', 'personal_sign'],
                notifications: ['accountsChanged', 'chainChanged'],
                accounts: [],
              },
            },
            sessionProperties: {},
            isMultichainOrigin: true,
          } as Caip25CaveatValue,
        },
      ],
    },
  },
});

// Mock store with comprehensive state
const createMockStore = (accountGroups = mockAccountGroups) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets: {
                'wallet-1': {
                  id: 'wallet-1',
                  metadata: { name: 'MetaMask Wallet' },
                  groups: Object.fromEntries(
                    accountGroups.map((group) => [group.id, group]),
                  ),
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              accounts: Object.fromEntries(
                accountGroups.flatMap((group) =>
                  group.accounts.map((account) => [account.id, account]),
                ),
              ),
              selectedAccount:
                accountGroups[0]?.accounts[0]?.id || 'account-id-1',
            },
          },
          AccountTrackerController: {
            accounts: Object.fromEntries(
              accountGroups.flatMap((group) =>
                group.accounts.map((account) => [
                  account.address,
                  { balance: '0x1bc16d674ec80000' }, // 2 ETH
                ]),
              ),
            ),
          },
          NetworkController: {
            networkConfigurationsByChainId: mockNetworkConfigurations,
          },
          PermissionController: {
            subjects: {},
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      }),
      sdk: () => ({
        wc2Metadata: {
          id: 'test-wc-id',
          url: 'https://example.com',
          lastVerifiedUrl: 'https://example.com',
        },
      }),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });

// Mock navigation component
const MockNavigationWrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MultichainAccountConnect"
        component={() => children}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

const MultichainAccountConnectMeta = {
  title:
    'Component Library / Views / MultichainAccounts / MultichainAccountConnect',
  component: MultichainAccountConnect,
  decorators: [
    (
      Story: React.ComponentType,
      {
        args,
      }: { args: { accountGroups?: AccountGroupWithInternalAccounts[] } },
    ) => (
      <Provider store={createMockStore(args.accountGroups)}>
        <ToastContextWrapper>
          <MockNavigationWrapper>
            <Box twClassName="flex-1 bg-default">
              <Story />
            </Box>
          </MockNavigationWrapper>
        </ToastContextWrapper>
      </Provider>
    ),
  ],
  argTypes: {
    hostInfo: {
      control: { type: 'object' },
      description: 'Host information for the dApp requesting connection',
    },
    permissionRequestId: {
      control: { type: 'text' },
      description: 'Unique identifier for the permission request',
    },
    accountGroups: {
      control: { type: 'object' },
      description: 'Available account groups for connection',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A comprehensive component for managing multichain account connections to dApps. Handles permission requests, account selection, network selection, and phishing protection.',
      },
    },
  },
};

export default MultichainAccountConnectMeta;

const createStoryArgs = (
  origin: string,
  isEip1193Request = false,
  accountGroups = mockAccountGroups,
) => ({
  route: {
    params: {
      hostInfo: createMockHostInfo(origin, isEip1193Request),
      permissionRequestId: 'test-permission-request-id',
    },
  } as AccountConnectProps['route'],
  accountGroups,
});

export const Default = {
  args: createStoryArgs('https://uniswap.org'),
};

export const EIP1193Request = {
  args: createStoryArgs('https://opensea.io', true),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the component handling a legacy EIP-1193 connection request.',
      },
    },
  },
};

export const WalletConnectDApp = {
  args: createStoryArgs('https://pancakeswap.finance'),
  parameters: {
    docs: {
      description: {
        story: 'Shows the component connecting to a dApp via WalletConnect.',
      },
    },
  },
};

export const SingleAccount = {
  args: createStoryArgs('https://compound.finance', false, [mockAccountGroup1]),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the component with only one account available for connection.',
      },
    },
  },
};

export const MultipleAccounts = {
  args: createStoryArgs('https://aave.com'),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the component with multiple accounts available for selection.',
      },
    },
  },
};

export const DeFiProtocol = {
  args: createStoryArgs('https://curve.fi'),
  parameters: {
    docs: {
      description: {
        story:
          'Example of connecting to a DeFi protocol with multichain support.',
      },
    },
  },
};

export const NFTMarketplace = {
  args: createStoryArgs('https://blur.io'),
  parameters: {
    docs: {
      description: {
        story: 'Example of connecting to an NFT marketplace.',
      },
    },
  },
};

export const GameDApp = {
  args: createStoryArgs('https://axieinfinity.com'),
  parameters: {
    docs: {
      description: {
        story: 'Example of connecting to a gaming dApp.',
      },
    },
  },
};

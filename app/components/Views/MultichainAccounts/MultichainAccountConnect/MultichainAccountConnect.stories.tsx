import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AccountGroupType, AccountGroupId } from '@metamask/account-api';
import { Box } from '@metamask/design-system-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Caip25EndowmentPermissionName,
  Caip25CaveatValue,
  Caip25CaveatType,
} from '@metamask/chain-agnostic-permission';

import MultichainAccountConnect from './MultichainAccountConnect';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts.type';
import { AccountConnectProps } from '../../AccountConnect/AccountConnect.types';
import { ToastContextWrapper } from '../../../../component-library/components/Toast';
import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';

const Stack = createStackNavigator();

const createMockAccountGroupWithInternalAccounts = (
  id: string,
  name: string,
  _accountId: string,
  address: string,
): AccountGroupWithInternalAccounts => ({
  id: id as AccountGroupId,
  type: AccountGroupType.SingleAccount,
  metadata: {
    name,
    pinned: false,
    hidden: false,
  },
  accounts: [createMockInternalAccount(address, name)],
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

const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://url'],
    blockExplorerUrls: ['https://url'],
  },
  'eip155:137': {
    chainId: '0x89',
    name: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
} as const;

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
          type: Caip25CaveatType,
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
  args: createStoryArgs('https://fake-url'),
};

export const SingleAccount = {
  args: createStoryArgs('https://fake-rul', false, [mockAccountGroup1]),
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
  args: createStoryArgs('https://fake-url'),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the component with multiple accounts available for selection.',
      },
    },
  },
};

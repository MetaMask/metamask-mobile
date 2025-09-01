import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AccountGroupType, AccountGroupId } from '@metamask/account-api';
import { Box } from '@metamask/design-system-react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';

import MultichainAccountConnectMultiSelector from './MultichainAccountConnectMultiSelector';
import { AccountGroupWithInternalAccounts } from '../../../../../selectors/multichainAccounts/accounts.type';
import { USER_INTENT } from '../../../../../constants/permissions';
import { ConnectionProps } from '../../../../../core/SDKConnect/Connection';

const createMockInternalAccount = (
  id: string,
  name: string,
  address: string,
): InternalAccount => ({
  id,
  address,
  type: 'eip155:eoa',
  scopes: ['eip155:1'],
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
  'Test Group 1',
  'account-id-1',
  '0x1234567890123456789012345678901234567890',
);

const mockAccountGroup2 = createMockAccountGroupWithInternalAccounts(
  'test-group2',
  'Test Group 2',
  'account-id-2',
  '0x2345678901234567890123456789012345678901',
);

const mockAccountGroup3 = createMockAccountGroupWithInternalAccounts(
  'test-group3',
  'Test Group 3',
  'account-id-3',
  '0x3456789012345678901234567890123456789012',
);

const mockAccountGroups: AccountGroupWithInternalAccounts[] = [
  mockAccountGroup1,
  mockAccountGroup2,
  mockAccountGroup3,
];

const mockConnection: ConnectionProps = {
  id: 'test-connection',
  origin: 'https://example.com',
  originatorInfo: {
    platform: 'web',
    apiVersion: '1.0.0',
    url: 'https://example.com',
    title: 'Test DApp',
    icon: 'https://example.com/icon.png',
    dappId: 'test-dapp-id',
  },
  validUntil: Date.now() + 3600000,
  lastAuthorized: Date.now(),
  otherPublicKey: 'test-public-key',
  scheme: 'https',
};

// Mock store with account sections
const mockStore = configureStore({
  reducer: {
    engine: () => ({
      backgroundState: {
        AccountTreeController: {
          accountTree: {
            wallets: {
              'wallet-1': {
                id: 'wallet-1',
                metadata: { name: 'MetaMask Wallet' },
                groups: {
                  'group-1': mockAccountGroup1,
                  'group-2': mockAccountGroup2,
                },
              },
              'wallet-2': {
                id: 'wallet-2',
                metadata: { name: 'Hardware Wallet' },
                groups: {
                  'group-3': mockAccountGroup3,
                },
              },
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              'account-id-1': mockAccountGroup1.accounts[0],
              'account-id-2': mockAccountGroup2.accounts[0],
              'account-id-3': mockAccountGroup3.accounts[0],
            },
            selectedAccount: 'account-id-1',
          },
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
  },
});

const MultichainAccountConnectMultiSelectorMeta = {
  title:
    'Component Library / Views / MultichainAccounts / MultichainAccountConnectMultiSelector',
  component: MultichainAccountConnectMultiSelector,
  decorators: [
    (Story: React.ComponentType) => (
      <Provider store={mockStore}>
        <Box twClassName="flex-1 bg-default">
          <Story />
        </Box>
      </Provider>
    ),
  ],
  argTypes: {
    onUserAction: { action: 'user action triggered' },
    onSubmit: { action: 'submit pressed' },
    onBack: { action: 'back pressed' },
    accountGroups: {
      control: { type: 'object' },
      defaultValue: mockAccountGroups,
    },
    defaultSelectedAccountGroupIds: {
      control: { type: 'object' },
      defaultValue: [mockAccountGroup1.id],
    },
    isLoading: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
    isRenderedAsBottomSheet: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
    showDisconnectAllButton: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
    hostname: {
      control: { type: 'text' },
      defaultValue: 'example.com',
    },
    screenTitle: {
      control: { type: 'text' },
      defaultValue: 'Connect Accounts',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A component for connecting multiple multichain accounts to a dApp with selection functionality.',
      },
    },
  },
};

export default MultichainAccountConnectMultiSelectorMeta;

export const Default = {
  args: {
    accountGroups: mockAccountGroups,
    defaultSelectedAccountGroupIds: [mockAccountGroup1.id],
    isLoading: false,
    onUserAction: (intent: USER_INTENT) => {
      // eslint-disable-next-line no-console
      console.log('User action:', intent);
    },
    onSubmit: (accountGroupIds: AccountGroupId[]) => {
      // eslint-disable-next-line no-console
      console.log('Submit with account group IDs:', accountGroupIds);
    },
    isRenderedAsBottomSheet: true,
    showDisconnectAllButton: true,
    hostname: 'example.com',
    connection: mockConnection,
    screenTitle: 'Connect Accounts',
    onBack: () => {
      // eslint-disable-next-line no-console
      console.log('Back pressed');
    },
  },
};

export const WithMultipleSelected = {
  args: {
    ...Default.args,
    defaultSelectedAccountGroupIds: [
      mockAccountGroup1.id,
      mockAccountGroup2.id,
    ],
  },
};

export const Loading = {
  args: {
    ...Default.args,
    isLoading: true,
  },
};

export const NoAccountsSelected = {
  args: {
    ...Default.args,
    defaultSelectedAccountGroupIds: [],
  },
};

export const WithoutDisconnectButton = {
  args: {
    ...Default.args,
    showDisconnectAllButton: false,
    defaultSelectedAccountGroupIds: [],
  },
};

export const NotAsBottomSheet = {
  args: {
    ...Default.args,
    isRenderedAsBottomSheet: false,
  },
};

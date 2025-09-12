import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupType } from '@metamask/account-api';
import { Box } from '@metamask/design-system-react-native';

import MultichainAccountSelectorList from './MultichainAccountSelectorList';

const createMockAccountGroup = (
  id: string,
  name: string,
  accounts: string[] = [`account-${id}`],
): AccountGroupObject =>
  ({
    id: id as AccountGroupObject['id'],
    type: AccountGroupType.SingleAccount,
    metadata: {
      name,
      pinned: false,
      hidden: false,
    },
    accounts: accounts as [string],
  } as AccountGroupObject);

const mockAccountGroup1 = createMockAccountGroup(
  'wallet-1/group-1',
  'Test Group 1',
  ['account-id-1'],
);
const mockAccountGroup2 = createMockAccountGroup(
  'wallet-1/group-2',
  'Test Group 2',
  ['account-id-2'],
);
const mockAccountGroup3 = createMockAccountGroup(
  'wallet-2/group-3',
  'Test Group 3',
  ['account-id-3'],
);

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
                  'wallet-1/group-1': mockAccountGroup1,
                  'wallet-1/group-2': mockAccountGroup2,
                },
              },
              'wallet-2': {
                id: 'wallet-2',
                metadata: { name: 'Hardware Wallet' },
                groups: {
                  'wallet-2/group-3': mockAccountGroup3,
                },
              },
            },
            selectedAccountGroup: 'wallet-1/group-1',
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              'account-id-1': {
                id: 'account-id-1',
                address: '0x1234567890123456789012345678901234567890',
                type: 'eip155:eoa',
                scopes: ['eip155:1'],
                options: {},
                methods: ['personal_sign', 'eth_sign', 'eth_signTypedData_v4'],
                metadata: {
                  name: 'Test Group 1',
                  keyring: { type: 'simple' },
                  importTime: Date.now(),
                },
              },
              'account-id-2': {
                id: 'account-id-2',
                address: '0x2345678901234567890123456789012345678901',
                type: 'eip155:eoa',
                scopes: ['eip155:1'],
                options: {},
                methods: ['personal_sign', 'eth_sign', 'eth_signTypedData_v4'],
                metadata: {
                  name: 'Test Group 2',
                  keyring: { type: 'simple' },
                  importTime: Date.now(),
                },
              },
              'account-id-3': {
                id: 'account-id-3',
                address: '0x3456789012345678901234567890123456789012',
                type: 'eip155:eoa',
                scopes: ['eip155:1'],
                options: {},
                methods: ['personal_sign', 'eth_sign', 'eth_signTypedData_v4'],
                metadata: {
                  name: 'Test Group 3',
                  keyring: { type: 'simple' },
                  importTime: Date.now(),
                },
              },
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

const MultichainAccountSelectorListMeta = {
  title:
    'Component Library / MultichainAccounts / MultichainAccountSelectorList',
  component: MultichainAccountSelectorList,
  decorators: [
    (Story: React.ComponentType) => (
      <Provider store={mockStore}>
        <Box twClassName="flex-1 p-4 bg-default">
          <Story />
        </Box>
      </Provider>
    ),
  ],
  argTypes: {
    onSelectAccount: { action: 'account selected' },
    selectedAccountGroups: {
      control: { type: 'object' },
      defaultValue: [mockAccountGroup1],
    },
    testID: {
      control: { type: 'text' },
      defaultValue: 'multichain-account-selector-list',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A component for selecting multichain accounts with search functionality and wallet grouping.',
      },
    },
  },
};

export default MultichainAccountSelectorListMeta;

export const Default = {
  args: {
    selectedAccountGroups: [mockAccountGroup1],
  },
};

export const MultipleSelected = {
  args: {
    selectedAccountGroups: [mockAccountGroup1, mockAccountGroup2],
  },
};

export const NoSelection = {
  args: {
    selectedAccountGroups: [],
  },
};

export const WithCustomTestID = {
  args: {
    selectedAccountGroups: [mockAccountGroup1],
    testID: 'custom-multichain-account-selector',
  },
};

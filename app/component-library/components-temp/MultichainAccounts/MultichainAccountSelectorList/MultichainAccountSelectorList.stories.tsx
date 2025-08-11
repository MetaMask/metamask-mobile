import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupType } from '@metamask/account-api';
import { Box } from '@metamask/design-system-react-native';

import MultichainAccountSelectorList from './MultichainAccountSelectorList';

const mockAccountGroup1: AccountGroupObject = {
  id: 'keyring:test-group1/ethereum' as const,
  type: AccountGroupType.SingleAccount,
  metadata: {
    name: 'Test Group 1',
    pinned: false,
    hidden: false,
  },
  accounts: ['account-id-1'],
} as AccountGroupObject;

const mockAccountGroup2: AccountGroupObject = {
  id: 'keyring:test-group2/ethereum' as const,
  type: AccountGroupType.SingleAccount,
  metadata: {
    name: 'Test Group 2',
    pinned: false,
    hidden: false,
  },
  accounts: ['account-id-2'],
} as AccountGroupObject;

const mockAccountGroup3: AccountGroupObject = {
  id: 'keyring:test-group3/ethereum' as const,
  type: AccountGroupType.SingleAccount,
  metadata: {
    name: 'Test Group 3',
    pinned: false,
    hidden: false,
  },
  accounts: ['account-id-3'],
} as AccountGroupObject;

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
    selectedAccountGroup: {
      control: { type: 'object' },
      defaultValue: null,
    },
    privacyMode: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
  },
};

export default MultichainAccountSelectorListMeta;

export const Default = {
  args: {
    selectedAccountGroup: mockAccountGroup1,
    privacyMode: false,
  },
};

import { AccountGroupObject } from '@metamask/account-tree-controller';
import React from 'react';
import { View } from 'react-native';
import AccountCell from '.';
import { mockTheme } from '../../../../util/theme';

const SAMPLE_ACCOUNT_GROUP = {
  metadata: { name: 'Account 1' },
  accounts: [],
  id: 'keyring:test-group/ethereum' as const,
} as AccountGroupObject;

const MultichainAccountRowMeta = {
  title: 'Component Library / MultichainAccounts',
  component: AccountCell,
  argTypes: {
    accountGroup: {
      control: { type: 'object' },
      defaultValue: SAMPLE_ACCOUNT_GROUP,
    },
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
  },
};
export default MultichainAccountRowMeta;

export const MultichainAddressSelectedRow = {
  render: (args: { accountGroup: AccountGroupObject }) => (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <AccountCell accountGroup={args.accountGroup} isSelected />
    </View>
  ),
};

export const MultichainAddressRow = {
  render: (args: { accountGroup: AccountGroupObject; isSelected: boolean }) => (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <AccountCell
        accountGroup={args.accountGroup}
        isSelected={args.isSelected}
      />
    </View>
  ),
};

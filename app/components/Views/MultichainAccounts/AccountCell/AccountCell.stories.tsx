import { AccountGroup } from '@metamask/account-tree-controller';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './AccountCell.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Box } from '../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { AccountCell } from './AccountCell';
import { mockTheme } from '../../../../util/theme';

const SAMPLE_ACCOUNT_GROUP = {
  metadata: { name: 'Account 1' },
  accounts: [],
  id: 'keyring:test-group:ethereum' as const,
} as AccountGroup;

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
  render: (args: { accountGroup: AccountGroup }) => (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <AccountCell accountGroup={args.accountGroup} isSelected={true} />
    </View>
  ),
};

export const MultichainAddressRow = {
  render: (args: { accountGroup: AccountGroup; isSelected: boolean }) => (
    <View
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

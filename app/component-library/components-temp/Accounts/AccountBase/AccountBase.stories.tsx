import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react-native';
import AccountBase from './AccountBase';
import { AccountBaseProps } from './AccountBase.types';
import { BadgeVariant } from '../../../components/Badges/Badge';

const AccountBaseMeta: ComponentMeta<typeof AccountBase> = {
  title: 'Components Temp / Accounts / AccountBase',
  component: AccountBase,
  argTypes: {
    accountBalance: {
      control: { type: 'number', min: 0, max: 1000, step: 0.01 },
    },
    accountTokenBalance: { control: 'text' },
    accountNativeCurrency: { control: 'text' },
    accountNetwork: { control: 'text' },
    accountName: { control: 'text' },
    accountBalanceLabel: { control: 'text' },
    accountAddress: { control: 'text' },
    useBlockieIcon: { control: 'boolean' },
  },
  args: {
    accountBalance: 1.23,
    accountTokenBalance: '',
    accountNativeCurrency: 'ETH',
    accountNetwork: 'Ethereum Main Network',
    accountName: 'Account 1',
    accountBalanceLabel: 'Balance:',
    accountAddress: '0x0000...0000',
    badgeProps: {
      variant: BadgeVariant.Network,
    },
    useBlockieIcon: false,
  },
};

export default AccountBaseMeta;

export const Default: ComponentStory<typeof AccountBase> = (args) => <AccountBase {...args} />;

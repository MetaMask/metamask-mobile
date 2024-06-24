/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

// Internal dependencies.
import AccountApproval from './index';

// Mock Redux store
const mockStore = createStore((state) => state, {
  // Add initial state here if needed
});

const AccountApprovalMeta = {
  title: 'Component Library / AccountApproval',
  component: AccountApproval,
  argTypes: {
    currentPageInformation: {
      control: 'object',
    },
    onConfirm: {
      action: 'onConfirm',
    },
    onCancel: {
      action: 'onCancel',
    },
    selectedAddress: {
      control: 'text',
    },
    tokensLength: {
      control: 'number',
    },
    navigation: {
      control: 'object',
    },
    accountsLength: {
      control: 'number',
    },
    networkType: {
      control: 'text',
    },
    walletConnectRequest: {
      control: 'boolean',
    },
    chainId: {
      control: 'text',
    },
    metrics: {
      control: 'object',
    },
  },
};
export default AccountApprovalMeta;

export const Default = (args: {
  currentPageInformation: object;
  onConfirm: () => void;
  onCancel: () => void;
  selectedAddress: string;
  tokensLength: number;
  navigation: object;
  accountsLength: number;
  networkType: string;
  walletConnectRequest: boolean;
  chainId: string;
  metrics: object;
}) => (
  <Provider store={mockStore}>
    <AccountApproval {...args} />
  </Provider>
);

Default.args = {
  currentPageInformation: {
    title: 'Sample Title',
    url: 'https://example.com',
    icon: 'https://example.com/icon.png',
  },
  selectedAddress: '0x1234567890abcdef1234567890abcdef12345678',
  tokensLength: 5,
  navigation: {},
  accountsLength: 3,
  networkType: 'mainnet',
  walletConnectRequest: false,
  chainId: '1',
  metrics: {},
};

/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';

// Internal dependencies.
import AccountApproval from './index';

// Mock initial state
const initialBackgroundState = {
  // Add properties from initial-background-state.json here
};

const MOCK_ACCOUNTS_CONTROLLER_STATE = {
  accounts: {
    '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
      balance: '0x0',
      address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
    },
  },
};

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

// Mock Redux store
const rootReducer = combineReducers({
  engine: (state = mockInitialState.engine) => state,
});

const mockStore = createStore(rootReducer);

const AccountApprovalMeta = {
  title: 'Component Library / AccountApproval',
  component: AccountApproval,
  decorators: [
    (Story: React.FC) => (
      <Provider store={mockStore}>
        <Story />
      </Provider>
    ),
  ],
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

interface AccountApprovalProps {
  currentPageInformation: {
    title: string;
    url: string;
    icon: string;
  };
  onConfirm?: () => void;
  onCancel?: () => void;
  selectedAddress?: string;
  tokensLength?: number;
  navigation?: object;
  accountsLength?: number;
  networkType?: string;
  walletConnectRequest?: boolean;
  chainId?: string;
  metrics?: object;
}

export const Default = (args: AccountApprovalProps) => (
  <AccountApproval {...args} />
);

Default.args = {
  currentPageInformation: {
    title: 'Sample Title',
    url: 'https://example.com',
    icon: 'https://example.com/icon.png',
  },
  selectedAddress: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
  tokensLength: 5,
  navigation: {},
  accountsLength: 3,
  networkType: 'mainnet',
  walletConnectRequest: false,
  chainId: '1',
  metrics: {},
};

export const PhishingWarning = (args: AccountApprovalProps) => (
  <AccountApproval {...args} />
);

PhishingWarning.args = {
  ...Default.args,
  currentPageInformation: {
    title: 'Phishing Site',
    url: 'phishing.com',
    icon: 'https://phishing.com/icon.png',
  },
};

PhishingWarning.play = async () => {
  // Simulate user interaction without using @storybook/testing-library
  const confirmButton = document.querySelector(
    'button[name="confirm"]',
  ) as HTMLElement;
  if (confirmButton) {
    confirmButton.click();
  }
};

/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { AccountGroupId } from '@metamask/account-api';
import { CaipChainId } from '@metamask/utils';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies
import { mockTheme } from '../../../../util/theme';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { Box } from '@metamask/design-system-react-native';

// Internal dependencies
import MultichainPermissionsSummary from './MultichainPermissionsSummary';

// Mock constants
const MOCK_GROUP_ID_1 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0' as AccountGroupId;
const MOCK_GROUP_ID_2 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1' as AccountGroupId;
const MOCK_GROUP_ID_3 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/2' as AccountGroupId;

const MOCK_ACCOUNT_ADDRESS = '0x742d35Cc6635C0532925a3b8D0b5Bb3C0e4C2c';
const MOCK_SOLANA_ADDRESS = 'DhJ4mFqW6NE7QWa4MzjZX9WcG5fQVkSC8YFVkKjHjPqK';

// Mock data
const MOCK_CURRENT_PAGE_INFORMATION = {
  currentEnsName: '',
  icon: 'mock-favicon.ico',
  url: 'https://mock-dapp.example.com/',
};

const MOCK_NETWORK_AVATARS = [
  {
    name: 'Ethereum Mainnet',
    imageSource: { uri: 'mock-ethereum-logo.png' },
    size: AvatarSize.Xs,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:1' as CaipChainId,
  },
  {
    name: 'Polygon',
    imageSource: { uri: 'mock-polygon-logo.png' },
    size: AvatarSize.Xs,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:137' as CaipChainId,
  },
  {
    name: 'Arbitrum',
    imageSource: { uri: 'mock-arbitrum-logo.png' },
    size: AvatarSize.Xs,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:42161' as CaipChainId,
  },
];

// Mock UUIDs for accounts
const MOCK_ACCOUNT_UUID_1 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const MOCK_ACCOUNT_UUID_2 = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
const MOCK_ACCOUNT_UUID_3 = 'f47ac10b-58cc-4372-a567-0e02b2c3d481';

// Simple mock account data for Storybook
const MOCK_ACCOUNT_GROUPS = [
  {
    id: MOCK_GROUP_ID_1,
    metadata: {
      name: 'Account 1',
      importTime: Date.now(),
    },
    accounts: [
      {
        id: MOCK_ACCOUNT_UUID_1,
        address: MOCK_ACCOUNT_ADDRESS,
        metadata: {
          name: 'Account 1',
          keyring: { type: KeyringTypes.hd },
        },
        type: EthAccountType.Eoa,
        methods: [],
        scopes: [],
        options: {},
      },
    ],
  },
  {
    id: MOCK_GROUP_ID_2,
    metadata: {
      name: 'Account 2',
      importTime: Date.now(),
    },
    accounts: [
      {
        id: MOCK_ACCOUNT_UUID_2,
        address: '0x742d35Cc6635C0532925a3b8D0b5Bb3C0e4C2c',
        metadata: {
          name: 'Account 2',
          keyring: { type: KeyringTypes.hd },
        },
        type: EthAccountType.Eoa,
        methods: [],
        scopes: [],
        options: {},
      },
    ],
  },
  {
    id: MOCK_GROUP_ID_3,
    metadata: {
      name: 'Solana Account',
      importTime: Date.now(),
    },
    accounts: [
      {
        id: MOCK_ACCOUNT_UUID_3,
        address: MOCK_SOLANA_ADDRESS,
        metadata: {
          name: 'Solana Account',
          keyring: { type: KeyringTypes.snap },
        },
        type: SolAccountType.DataAccount,
        methods: [],
        scopes: [],
        options: {},
      },
    ],
  },
];

// Simple mock store state for Storybook
const mockStoreState = {
  user: { appTheme: 'os' },
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [MOCK_ACCOUNT_UUID_1]: {
              id: MOCK_ACCOUNT_UUID_1,
              address: MOCK_ACCOUNT_ADDRESS,
              metadata: {
                name: 'Account 1',
                keyring: { type: KeyringTypes.hd },
              },
              type: EthAccountType.Eoa,
              methods: [],
              scopes: [],
              options: {},
            },
            [MOCK_ACCOUNT_UUID_2]: {
              id: MOCK_ACCOUNT_UUID_2,
              address: '0x742d35Cc6635C0532925a3b8D0b5Bb3C0e4C2c',
              metadata: {
                name: 'Account 2',
                keyring: { type: KeyringTypes.hd },
              },
              type: EthAccountType.Eoa,
              methods: [],
              scopes: [],
              options: {},
            },
            [MOCK_ACCOUNT_UUID_3]: {
              id: MOCK_ACCOUNT_UUID_3,
              address: MOCK_SOLANA_ADDRESS,
              metadata: {
                name: 'Solana Account',
                keyring: { type: KeyringTypes.snap },
              },
              type: SolAccountType.DataAccount,
              methods: [],
              scopes: [],
              options: {},
            },
          },
          selectedAccount: MOCK_ACCOUNT_UUID_1,
        },
      },
      PreferencesController: {
        privacyMode: false,
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                url: 'https://mainnet.infura.io/v3/test',
                type: 'infura',
              },
            ],
            defaultBlockExplorerUrlIndex: 0,
            blockExplorerUrls: ['https://etherscan.io'],
          },
        },
      },
      AccountTreeController: {
        accountTree: {
          selectedAccountGroup: MOCK_GROUP_ID_1,
          wallets: {
            'wallet-1': {
              id: 'wallet-1',
              metadata: { name: 'MetaMask Wallet' },
              groups: {
                [MOCK_GROUP_ID_1]: MOCK_ACCOUNT_GROUPS[0],
                [MOCK_GROUP_ID_2]: MOCK_ACCOUNT_GROUPS[1],
                [MOCK_GROUP_ID_3]: MOCK_ACCOUNT_GROUPS[2],
              },
            },
          },
        },
        accountGroupsMetadata: {},
        accountWalletsMetadata: {},
      },
    },
  },
};

const defaultProps = {
  currentPageInformation: MOCK_CURRENT_PAGE_INFORMATION,
  selectedAccountGroupIds: [MOCK_GROUP_ID_1],
  networkAvatars: MOCK_NETWORK_AVATARS,
  onEdit: () => {
    // Edit accounts pressed
  },
  onEditNetworks: () => {
    // Edit networks pressed
  },
  onBack: () => {
    // Back pressed
  },
  onCancel: () => {
    // Cancel pressed
  },
  onConfirm: () => {
    // Confirm pressed
  },
  onCreateAccount: () => {
    // Create account pressed
  },
  onUserAction: () => {
    // User action
  },
  onAddNetwork: () => {
    // Add network pressed
  },
  onChooseFromPermittedNetworks: () => {
    // Choose from permitted networks pressed
  },
  setTabIndex: () => {
    // Tab index changed
  },
};

// Create mock store
const mockStore = configureStore([]);

const MultichainPermissionsSummaryMeta = {
  title:
    'Component Library / MultichainAccounts / MultichainPermissionsSummary',
  component: MultichainPermissionsSummary,
  decorators: [
    (Story: React.ComponentType) => (
      <Provider store={mockStore(mockStoreState)}>
        <Story />
      </Provider>
    ),
  ],
  argTypes: {
    isAlreadyConnected: {
      control: { type: 'boolean' },
      description: 'Whether the dapp is already connected',
    },
    isNetworkSwitch: {
      control: { type: 'boolean' },
      description: 'Whether this is a network switch request',
    },
    isNonDappNetworkSwitch: {
      control: { type: 'boolean' },
      description: 'Whether this is a non-dapp network switch',
    },
    showActionButtons: {
      control: { type: 'boolean' },
      description: 'Whether to show action buttons',
    },
    isDisconnectAllShown: {
      control: { type: 'boolean' },
      description: 'Whether to show disconnect all button',
    },
    showAccountsOnly: {
      control: { type: 'boolean' },
      description: 'Show only accounts tab content',
    },
    showPermissionsOnly: {
      control: { type: 'boolean' },
      description: 'Show only permissions tab content',
    },
    tabIndex: {
      control: { type: 'number', min: 0, max: 1 },
      description: 'Active tab index',
    },
  },
};

export default MultichainPermissionsSummaryMeta;

export const NewConnection = {
  render: () => (
    <Box
      style={{
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <MultichainPermissionsSummary
        {...defaultProps}
        isAlreadyConnected={false}
        selectedAccountGroupIds={[MOCK_GROUP_ID_1]}
        networkAvatars={[MOCK_NETWORK_AVATARS[0]]}
      />
    </Box>
  ),
};

export const AlreadyConnected = {
  render: () => (
    <Box
      style={{
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <MultichainPermissionsSummary
        {...defaultProps}
        isAlreadyConnected
        selectedAccountGroupIds={[MOCK_GROUP_ID_1, MOCK_GROUP_ID_2]}
        networkAvatars={MOCK_NETWORK_AVATARS}
      />
    </Box>
  ),
};

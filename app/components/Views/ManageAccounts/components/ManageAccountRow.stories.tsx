import { AccountGroupObject } from '@metamask/account-tree-controller';
import {
  AccountGroupType,
  AccountWalletType,
  type AccountGroupId,
} from '@metamask/account-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Box } from '@metamask/design-system-react-native';
import ManageAccountRow, {
  ManageAccountRowVariant,
  type ManageAccountRowProps,
} from './ManageAccountRow';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import {
  AvatarAccountType,
  type AccountAvatarVariant,
} from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';

const SAMPLE_ACCOUNT_GROUP = {
  type: AccountGroupType.SingleAccount,
  metadata: {
    name: 'Account 1',
    pinned: false,
    hidden: false,
    lastSelected: 0,
  },
  accounts: ['account-1'],
  id: 'keyring:test-group/ethereum' as const,
} as AccountGroupObject;

const mockStore = configureStore({
  reducer: {
    engine: () => ({
      backgroundState: {
        ...initialBackgroundState,
        AccountTreeController: {
          accountTree: {
            wallets: {
              'keyring:test-group': {
                id: 'keyring:test-group',
                type: AccountWalletType.Keyring,
                metadata: {
                  name: 'Test Wallet',
                  keyring: { type: KeyringTypes.simple },
                },
                groups: {
                  'keyring:test-group/ethereum': SAMPLE_ACCOUNT_GROUP,
                },
              },
            },
          },
          selectedAccountGroup: 'keyring:test-group/ethereum',
          accountGroupsMetadata: {},
          accountWalletsMetadata: {},
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              'account-1': {
                id: 'account-1',
                address: '0x1234567890123456789012345678901234567890',
                metadata: {
                  name: 'Account 1',
                  keyring: { type: 'HD Key Tree' },
                },
                options: {},
                methods: [],
                scopes: ['eip155:0'],
                type: 'eip155:eoa',
              },
            },
            selectedAccount: 'account-1',
          },
        },
        TokenBalancesController: {
          tokenBalances: {},
        },
        TokenRatesController: {
          marketData: {},
        },
        MultichainBalancesController: {
          balances: {},
        },
        MultichainAssetsRatesController: {
          conversionRates: {},
        },
        TokensController: {
          allTokens: {},
          allIgnoredTokens: {},
          allDetectedTokens: {},
        },
        CurrencyRateController: {
          currentCurrency: 'usd',
          currencyRates: {
            ETH: {
              conversionRate: 2000,
              conversionDate: Date.now(),
            },
          },
        },
        NetworkController: {
          selectedNetworkClientId: 'mainnet',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              rpcEndpoints: [],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: [],
              defaultBlockExplorerUrlIndex: 0,
              name: 'Ethereum Mainnet',
              nativeCurrency: 'ETH',
            },
          },
          networksMetadata: {
            mainnet: {
              EIPS: {},
              status: 'available',
            },
          },
        },
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
            },
          },
        },
      },
    }),
    settings: () => ({
      useBlockieIcon: false,
      showFiatInTestnets: false,
    }),
  },
});

const noopToggleHidden = (
  _groupId: AccountGroupId,
  _nextHidden: boolean,
): void => {
  // Storybook placeholder — wire to Actions panel when needed.
};

const noopRemove = (_groupId: AccountGroupId): void => {
  // Storybook placeholder — wire to Actions panel when needed.
};

const defaultArgs: ManageAccountRowProps = {
  accountGroup: SAMPLE_ACCOUNT_GROUP,
  isHidden: false,
  variant: ManageAccountRowVariant.Hide,
  onToggleHidden: noopToggleHidden,
  onRemove: noopRemove,
  avatarAccountType: AvatarAccountType.Maskicon,
};

interface StoryArgs extends ManageAccountRowProps {
  avatarAccountType: AccountAvatarVariant;
}

const ManageAccountRowMeta = {
  title: 'Views / Manage Accounts / ManageAccountRow',
  component: ManageAccountRow,
  decorators: [
    (Story: React.ComponentType) => (
      <Provider store={mockStore}>
        <Box twClassName="flex-1 bg-default py-2">
          <Story />
        </Box>
      </Provider>
    ),
  ],
  argTypes: {
    accountGroup: { control: { type: 'object' } },
    isHidden: { control: { type: 'boolean' } },
    variant: {
      control: { type: 'select' },
      options: Object.values(ManageAccountRowVariant),
    },
    avatarAccountType: {
      control: {
        type: 'select',
        options: Object.values(AvatarAccountType),
      },
    },
    onToggleHidden: { action: 'toggleHidden' },
    onRemove: { action: 'remove' },
  },
  args: defaultArgs,
};

export default ManageAccountRowMeta;

const renderRow = (args: StoryArgs) => (
  <ManageAccountRow
    accountGroup={args.accountGroup}
    isHidden={args.isHidden}
    variant={args.variant}
    onToggleHidden={args.onToggleHidden}
    onRemove={args.onRemove}
    avatarAccountType={args.avatarAccountType}
  />
);

/** Entropy / HD row — eye toggle only (visible). */
export const HideVariant = {
  render: renderRow,
  args: {
    variant: ManageAccountRowVariant.Hide,
    isHidden: false,
  },
};

/** Entropy / HD row — hidden state (dimmed content, eye-slash toggle). */
export const HiddenRow = {
  render: renderRow,
  args: {
    variant: ManageAccountRowVariant.Hide,
    isHidden: true,
  },
};

/** Imported row — remove control only. */
export const RemoveVariant = {
  render: renderRow,
  args: {
    variant: ManageAccountRowVariant.Remove,
    isHidden: false,
  },
};

/** Hardware row — both hide and remove controls. */
export const HideAndRemoveVariant = {
  render: renderRow,
  args: {
    variant: ManageAccountRowVariant.HideAndRemove,
    isHidden: false,
  },
};

/** Snap row — no trailing actions. */
export const NoneVariant = {
  render: renderRow,
  args: {
    variant: ManageAccountRowVariant.None,
    isHidden: false,
  },
};

/** Interactive — adjust variant, hidden state, and avatar type via controls. */
export const Interactive = {
  render: renderRow,
};

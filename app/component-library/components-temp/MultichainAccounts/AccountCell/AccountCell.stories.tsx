import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupType } from '@metamask/account-api';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Box } from '@metamask/design-system-react-native';
import AccountCell from '.';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const SAMPLE_ACCOUNT_GROUP = {
  type: AccountGroupType.SingleAccount,
  metadata: {
    name: 'Account 1',
    pinned: false,
    hidden: false,
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
                metadata: { name: 'Test Wallet' },
                groups: {
                  'keyring:test-group/ethereum': SAMPLE_ACCOUNT_GROUP,
                },
              },
            },
            selectedAccountGroup: 'keyring:test-group/ethereum',
          },
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

const MultichainAccountRowMeta = {
  title: 'Component Library / MultichainAccounts/ AccountCell',
  component: AccountCell,
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
    <AccountCell accountGroup={args.accountGroup} isSelected />
  ),
};

export const MultichainAddressRow = {
  render: (args: { accountGroup: AccountGroupObject; isSelected: boolean }) => (
    <AccountCell
      accountGroup={args.accountGroup}
      isSelected={args.isSelected}
    />
  ),
};

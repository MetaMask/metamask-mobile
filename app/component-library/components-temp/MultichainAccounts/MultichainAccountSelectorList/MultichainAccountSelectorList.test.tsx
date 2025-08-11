import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { AccountWalletType, AccountGroupType } from '@metamask/account-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import MultichainAccountSelectorList from './MultichainAccountSelectorList';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { RootState } from '../../../../reducers';

const createMockAccountGroup = (
  id: string,
  name: string,
): AccountGroupObject => ({
  id: id as AccountGroupObject['id'],
  type: AccountGroupType.SingleAccount,
  accounts: [`account-${id}`] as [string],
  metadata: {
    name,
    pinned: false,
    hidden: false,
  },
});

const createMockWallet = (
  id: string,
  name: string,
  groups: AccountGroupObject[],
): AccountWalletObject => {
  // Filter to only include SingleAccount groups for Keyring wallet type
  const singleAccountGroups = groups.filter(
    (
      group,
    ): group is Extract<
      AccountGroupObject,
      { type: AccountGroupType.SingleAccount }
    > => group.type === AccountGroupType.SingleAccount,
  );

  return {
    id: id as AccountWalletObject['id'],
    type: AccountWalletType.Keyring,
    metadata: {
      name,
      keyring: {
        type: KeyringTypes.simple,
      },
    },
    groups: singleAccountGroups.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {} as Record<string, Extract<AccountGroupObject, { type: AccountGroupType.SingleAccount }>>),
  };
};

const mockFeatureFlagController = {
  RemoteFeatureFlagController: {
    remoteFeatureFlags: {
      enableMultichainAccounts: {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '1.0.0',
      },
    },
  },
};

describe('MultichainAccountSelectorList', () => {
  const mockOnSelectAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows accounts correctly', () => {
    const account1 = createMockAccountGroup('group1', 'Account 1');
    const account2 = createMockAccountGroup('group2', 'Account 2');
    const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
    const wallet2 = createMockWallet('wallet2', 'Wallet 2', [account2]);

    const mockState: DeepPartial<RootState> = {
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets: {
                [`keyring:${wallet1.id}`]: wallet1,
                [`keyring:${wallet2.id}`]: wallet2,
              } as Record<string, AccountWalletObject>,
            },
          },
          ...mockFeatureFlagController,
        },
      },
    };

    const { getByText } = renderWithProvider(
      <MultichainAccountSelectorList
        onSelectAccount={mockOnSelectAccount}
        selectedAccountGroup={account1}
      />,
      { state: mockState },
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Wallet 2')).toBeTruthy();
  });

  it('shows accounts correctly when there are multiple accounts with different categories', () => {
    const srpAccount = createMockAccountGroup('srp-group', 'SRP Account');
    const snapAccount = createMockAccountGroup('snap-group', 'Snap Account');
    const srpWallet = createMockWallet('srp-wallet', 'Wallet 1', [srpAccount]);
    const snapWallet = createMockWallet('snap-wallet', 'Simple Keyring', [
      snapAccount,
    ]);

    const mockState: DeepPartial<RootState> = {
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets: {
                [`keyring:${srpWallet.id}`]: srpWallet,
                [`snap:${snapWallet.id}`]: snapWallet,
              } as Record<string, AccountWalletObject>,
            },
          },
          ...mockFeatureFlagController,
        },
      },
    };

    const { getByText } = renderWithProvider(
      <MultichainAccountSelectorList
        onSelectAccount={mockOnSelectAccount}
        selectedAccountGroup={srpAccount}
      />,
      { state: mockState },
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Simple Keyring')).toBeTruthy();
  });

  it('shows accounts correctly when there are multiple accounts with hardware wallets', () => {
    const srpAccount = createMockAccountGroup('srp-group', 'SRP Account');
    const ledgerAccount = createMockAccountGroup(
      'ledger-group',
      'Ledger Account',
    );
    const srpWallet = createMockWallet('srp-wallet', 'Wallet 1', [srpAccount]);
    const ledgerWallet = createMockWallet('ledger-wallet', 'Ledger', [
      ledgerAccount,
    ]);

    const mockState: DeepPartial<RootState> = {
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets: {
                [`keyring:${srpWallet.id}`]: srpWallet,
                [`keyring:${ledgerWallet.id}`]: ledgerWallet,
              } as Record<string, AccountWalletObject>,
            },
          },
          ...mockFeatureFlagController,
        },
      },
    };

    const { getByText } = renderWithProvider(
      <MultichainAccountSelectorList
        onSelectAccount={mockOnSelectAccount}
        selectedAccountGroup={srpAccount}
      />,
      { state: mockState },
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Ledger')).toBeTruthy();
  });

  it('shows the correct account as selected', () => {
    const account1 = createMockAccountGroup('group1', 'Account 1');
    const account2 = createMockAccountGroup('group2', 'Account 2');
    const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
      account1,
      account2,
    ]);

    const mockState: DeepPartial<RootState> = {
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets: {
                [`keyring:${wallet1.id}`]: wallet1,
              } as Record<string, AccountWalletObject>,
            },
          },
          ...mockFeatureFlagController,
        },
      },
    };

    const { getAllByTestId } = renderWithProvider(
      <MultichainAccountSelectorList
        onSelectAccount={mockOnSelectAccount}
        selectedAccountGroup={account2}
      />,
      { state: mockState },
    );

    const accountCells = getAllByTestId('multichain-account-cell-container');
    fireEvent.press(accountCells[0]);

    expect(mockOnSelectAccount).toHaveBeenCalledWith(account1);
  });
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { AccountWalletCategory } from '@metamask/account-api';
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
  accounts: [`account-${id}`],
  metadata: { name },
});

const createMockWallet = (
  id: string,
  name: string,
  groups: AccountGroupObject[],
): AccountWalletObject => ({
  id: id as AccountWalletObject['id'],
  metadata: {
    name,
    type: AccountWalletCategory.Entropy,
    entropy: {
      id: 'entropy-id',
      index: 0,
    },
  },
  groups: groups.reduce((acc, group) => {
    acc[group.id] = group;
    return acc;
  }, {} as Record<string, AccountGroupObject>),
});

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

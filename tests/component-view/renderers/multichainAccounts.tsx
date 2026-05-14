import '../mocks';
import React from 'react';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import Engine from '../../../app/core/Engine';
import Routes from '../../../app/constants/navigation/Routes';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import MultichainAccountSelectorList from '../../../app/component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { AccountGroupDetails } from '../../../app/components/Views/MultichainAccounts/AccountGroupDetails/AccountGroupDetails';
import { EditMultichainAccountName } from '../../../app/components/Views/MultichainAccounts/sheets/EditMultichainAccountName';
import { DeleteAccount } from '../../../app/components/Views/MultichainAccounts/sheets/DeleteAccount/DeleteAccount';
import {
  buildMultichainAccountsFixture,
  type MultichainAccountsFixture,
} from '../presets/multichainAccounts';

interface AccountsControllerMock {
  state: {
    internalAccounts: {
      accounts: Record<string, InternalAccount>;
      selectedAccount: string;
    };
    accountIdByAddress: Record<string, string>;
  };
  listAccounts: jest.Mock<InternalAccount[], []>;
  listMultichainAccounts: jest.Mock<InternalAccount[], []>;
}

function syncEngineAccounts(fixture: MultichainAccountsFixture) {
  const accountsController = Engine.context
    .AccountsController as unknown as AccountsControllerMock;
  const selectedAccount = Object.keys(fixture.internalAccounts)[0] ?? '';

  accountsController.state.internalAccounts = {
    accounts: fixture.internalAccounts,
    selectedAccount,
  };
  accountsController.state.accountIdByAddress = Object.values(
    fixture.internalAccounts,
  ).reduce<Record<string, string>>(
    (addressMap, account) => ({
      ...addressMap,
      [account.address]: account.id,
      [account.address.toLowerCase()]: account.id,
    }),
    {},
  );
  accountsController.listAccounts.mockReturnValue(
    Object.values(fixture.internalAccounts),
  );
  accountsController.listMultichainAccounts.mockReturnValue(
    Object.values(fixture.internalAccounts),
  );
}

interface FixtureRendererOptions {
  fixture?: MultichainAccountsFixture;
  overrides?: DeepPartial<RootState>;
}

function getFixture(options: FixtureRendererOptions = {}) {
  const fixture = options.fixture ?? buildMultichainAccountsFixture();
  if (options.overrides) {
    fixture.state = {
      ...fixture.state,
      ...options.overrides,
    } as DeepPartial<RootState>;
  }
  syncEngineAccounts(fixture);
  return fixture;
}

interface AccountSelectorRendererOptions extends FixtureRendererOptions {
  selectedAccountGroups?: AccountGroupObject[];
  showCheckbox?: boolean;
  showFooter?: boolean;
  hideAccountCellMenu?: boolean;
  chainId?: string;
  setKeyboardAvoidingViewEnabled?: (enabled: boolean) => void;
  showExternalAccountOnEmptySearch?: boolean;
  onSelectAccount?: (accountGroup: AccountGroupObject) => void;
  onSelectExternalAccount?: (address: string) => void;
  selectedExternalAddress?: string;
}

export function renderMultichainAccountSelectorList(
  options: AccountSelectorRendererOptions = {},
) {
  const fixture = getFixture(options);
  const SelectorScreen = () => (
    <MultichainAccountSelectorList
      selectedAccountGroups={options.selectedAccountGroups ?? []}
      showCheckbox={options.showCheckbox}
      showFooter={options.showFooter ?? true}
      hideAccountCellMenu={options.hideAccountCellMenu ?? true}
      chainId={options.chainId}
      setKeyboardAvoidingViewEnabled={options.setKeyboardAvoidingViewEnabled}
      showExternalAccountOnEmptySearch={
        options.showExternalAccountOnEmptySearch
      }
      onSelectAccount={options.onSelectAccount}
      onSelectExternalAccount={options.onSelectExternalAccount}
      selectedExternalAddress={options.selectedExternalAddress}
    />
  );

  return {
    ...renderComponentViewScreen(
      SelectorScreen,
      { name: 'MultichainAccountSelectorList' },
      { state: fixture.state },
    ),
    fixture,
  };
}

export function renderAccountGroupDetailsWithRoutes(
  options: FixtureRendererOptions = {},
) {
  const fixture = getFixture(options);
  return {
    ...renderScreenWithRoutes(
      AccountGroupDetails as unknown as React.ComponentType,
      { name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS },
      [
        {
          name: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
          Component:
            EditMultichainAccountName as unknown as React.ComponentType<unknown>,
        },
      ],
      { state: fixture.state },
      { accountGroup: fixture.groups.account1 },
    ),
    fixture,
  };
}

export function renderEditMultichainAccountName(
  options: FixtureRendererOptions = {},
) {
  const fixture = getFixture(options);
  return {
    ...renderComponentViewScreen(
      EditMultichainAccountName as unknown as React.ComponentType,
      { name: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME },
      { state: fixture.state },
      { accountGroup: fixture.groups.account1 },
    ),
    fixture,
  };
}

interface DeleteAccountRendererOptions extends FixtureRendererOptions {
  account?: InternalAccount;
}

export function renderDeleteAccountWithRoutes(
  options: DeleteAccountRendererOptions = {},
) {
  const fixture = getFixture(options);
  const account =
    options.account ??
    fixture.internalAccounts[
      fixture.groups.importedAccount?.accounts[0] ??
        Object.keys(fixture.internalAccounts)[0]
    ];

  return {
    ...renderScreenWithRoutes(
      DeleteAccount as unknown as React.ComponentType,
      { name: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT },
      [{ name: Routes.WALLET_VIEW }],
      { state: fixture.state },
      { account },
    ),
    fixture,
    account,
  };
}

export function renderMultichainComponent(
  component: React.ReactElement,
  options: FixtureRendererOptions = {},
) {
  const fixture = getFixture(options);
  return {
    ...renderWithProvider(component, { state: fixture.state }),
    fixture,
  };
}

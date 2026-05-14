import '../mocks';
import React from 'react';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupId } from '@metamask/account-api';
import { CaipChainId } from '@metamask/utils';
import Engine from '../../../app/core/Engine';
import Routes from '../../../app/constants/navigation/Routes';
import {
  createRouteParamsProbe,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../render';
import { deepMerge } from '../stateFixture';
import MultichainAccountSelectorList from '../../../app/component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { AccountGroupDetails } from '../../../app/components/Views/MultichainAccounts/AccountGroupDetails/AccountGroupDetails';
import { EditMultichainAccountName } from '../../../app/components/Views/MultichainAccounts/sheets/EditMultichainAccountName';
import { DeleteAccount } from '../../../app/components/Views/MultichainAccounts/sheets/DeleteAccount/DeleteAccount';
import MultichainPermissionsSummary, {
  type MultichainPermissionsSummaryProps,
} from '../../../app/components/Views/MultichainAccounts/MultichainPermissionsSummary/MultichainPermissionsSummary';
import MultichainAccountsIntroModal from '../../../app/components/Views/MultichainAccounts/IntroModal/MultichainAccountsIntroModal';
import LearnMoreBottomSheet from '../../../app/components/Views/MultichainAccounts/IntroModal/LearnMoreBottomSheet';
import { PrivateKeyList } from '../../../app/components/Views/MultichainAccounts/PrivateKeyList/PrivateKeyList';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../app/component-library/components/Avatars/Avatar';
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
    fixture.state = deepMerge(
      fixture.state as Record<string, unknown>,
      options.overrides as Record<string, unknown>,
    ) as DeepPartial<RootState>;
  }
  syncEngineAccounts(fixture);
  return fixture;
}

const BrowserRouteProbe = createRouteParamsProbe(
  Routes.BROWSER.HOME,
) as React.ComponentType<unknown>;

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

interface AccountGroupDetailsRendererOptions extends FixtureRendererOptions {
  accountGroup?: AccountGroupObject;
}

const MultichainAccountDetailActionsRouteProbe = createRouteParamsProbe(
  Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
) as React.ComponentType<unknown>;
const AddressListRouteProbe = createRouteParamsProbe(
  Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST,
) as React.ComponentType<unknown>;
const PrivateKeyListRouteProbe = createRouteParamsProbe(
  Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST,
) as React.ComponentType<unknown>;

export function renderAccountGroupDetailsWithRoutes(
  options: AccountGroupDetailsRendererOptions = {},
) {
  const fixture = getFixture(options);
  const accountGroup = options.accountGroup ?? fixture.groups.account1;
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
        {
          name: Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
          Component: MultichainAccountDetailActionsRouteProbe,
        },
        {
          name: Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST,
          Component: AddressListRouteProbe,
        },
        {
          name: Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST,
          Component: PrivateKeyListRouteProbe,
        },
      ],
      { state: fixture.state },
      { accountGroup },
    ),
    fixture,
    accountGroup,
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

export function renderMultichainAccountsIntroModal(
  options: FixtureRendererOptions = {},
) {
  const fixture = getFixture(options);
  return {
    ...renderScreenWithRoutes(
      MultichainAccountsIntroModal as unknown as React.ComponentType,
      { name: Routes.MODAL.MULTICHAIN_ACCOUNTS_INTRO },
      [
        { name: Routes.BROWSER.HOME, Component: BrowserRouteProbe },
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
      ],
      { state: fixture.state },
    ),
    fixture,
  };
}

export function renderLearnMoreBottomSheet(
  options: FixtureRendererOptions = {},
) {
  const fixture = getFixture(options);
  return {
    ...renderScreenWithRoutes(
      LearnMoreBottomSheet as unknown as React.ComponentType,
      { name: Routes.MODAL.MULTICHAIN_ACCOUNTS_LEARN_MORE },
      [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
      { state: fixture.state },
    ),
    fixture,
  };
}

export function renderPrivateKeyList(options: FixtureRendererOptions = {}) {
  const fixture = getFixture(options);
  return {
    ...renderComponentViewScreen(
      PrivateKeyList as unknown as React.ComponentType,
      { name: Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST },
      { state: fixture.state },
      {
        groupId: fixture.groups.account1.id,
        title: fixture.groups.account1.metadata.name,
      },
    ),
    fixture,
  };
}

interface PermissionsSummaryRendererOptions extends FixtureRendererOptions {
  props?: Partial<MultichainPermissionsSummaryProps>;
}

export function renderMultichainPermissionsSummary(
  options: PermissionsSummaryRendererOptions = {},
) {
  const fixture = getFixture(options);
  const SummaryScreen = () => (
    <MultichainPermissionsSummary
      currentPageInformation={{
        currentEnsName: '',
        icon: 'https://metamask.io/favicon.ico',
        url: 'https://portfolio.metamask.io',
      }}
      selectedAccountGroupIds={[fixture.groups.account1.id as AccountGroupId]}
      networkAvatars={[
        {
          name: 'Ethereum Main Network',
          imageSource: { uri: 'ethereum-mainnet.png' },
          size: AvatarSize.Xs,
          variant: AvatarVariant.Network,
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ]}
      {...options.props}
    />
  );

  return {
    ...renderScreenWithRoutes(
      SummaryScreen,
      { name: 'MultichainPermissionsSummary' },
      [{ name: Routes.MODAL.ROOT_MODAL_FLOW }, { name: Routes.BROWSER.HOME }],
      { state: fixture.state },
    ),
    fixture,
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

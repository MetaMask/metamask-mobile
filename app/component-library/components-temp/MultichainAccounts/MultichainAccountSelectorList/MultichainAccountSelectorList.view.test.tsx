import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import Engine from '../../../../core/Engine';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderMultichainAccountSelectorList } from '../../../../../tests/component-view/renderers/multichainAccounts';
import {
  buildMultichainAccountsFixture,
  MULTICHAIN_TEST_ACCOUNTS,
} from '../../../../../tests/component-view/presets/multichainAccounts';
import { AccountListBottomSheetSelectorsIDs } from '../../../../components/Views/AccountSelector/AccountListBottomSheet.testIds';
import {
  MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_ERROR_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
} from './MultichainAccountSelectorList.constants';
import { AccountCellIds } from '../AccountCell/AccountCell.testIds';
import { ACCOUNT_LIST_CELL_TEST_IDS } from './AccountListCell/AccountListCell.testIds';
import { EXTERNAL_ACCOUNT_CELL_TEST_IDS } from './ExternalAccountCell/ExternalAccountCell.testIds';

const EXTERNAL_ADDRESS = '0x1111111111111111111111111111111111111111';

interface ImmediateInteractionManager {
  runAfterInteractions: (callback: () => void) => { cancel: () => void };
}

const immediateInteractionManager =
  InteractionManager as unknown as ImmediateInteractionManager;

function renameGroup(
  fixture: ReturnType<typeof buildMultichainAccountsFixture>,
  accountKey: keyof typeof MULTICHAIN_TEST_ACCOUNTS,
  name: string,
) {
  const account = MULTICHAIN_TEST_ACCOUNTS[accountKey];
  const group = Object.values(fixture.groups).find((candidate) =>
    candidate?.accounts.includes(account.id),
  );
  if (group) {
    group.metadata.name = name;
  }
  fixture.internalAccounts[account.id].metadata.name = name;
}

describeForPlatforms('MultichainAccountSelectorList account syncing', () => {
  let runAfterInteractionsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    runAfterInteractionsSpy = jest
      .spyOn(immediateInteractionManager, 'runAfterInteractions')
      .mockImplementation((callback: () => void) => {
        callback();
        return { cancel: jest.fn() };
      });
  });

  afterEach(() => {
    runAfterInteractionsSpy.mockRestore();
  });

  it('adds a new account and syncs it', async () => {
    const createAccountSpy = jest.spyOn(
      Engine.context.MultichainAccountService,
      'createNextMultichainAccountGroup',
    );
    const { getByTestId } = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: false,
      }),
    });

    fireEvent.press(
      getByTestId(AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT),
    );

    await waitFor(() => {
      expect(createAccountSpy).toHaveBeenCalledWith({
        entropySource: 'entropy-source-1',
      });
    });

    createAccountSpy.mockRestore();
  });

  it('selects an account from the list', async () => {
    const onSelectAccount = jest.fn();
    const { findByText, fixture } = renderMultichainAccountSelectorList({
      onSelectAccount,
      showFooter: false,
    });

    fireEvent.press(await findByText(MULTICHAIN_TEST_ACCOUNTS.account1.name));

    expect(onSelectAccount).toHaveBeenCalledWith(fixture.groups.account1);
  });

  it('shows selected account checkboxes', async () => {
    const fixture = buildMultichainAccountsFixture({
      includeSecondAccount: true,
    });
    const account2Group = fixture.groups.account2;
    if (!account2Group) {
      throw new Error('Expected fixture to include Account 2');
    }

    const { findByTestId } = renderMultichainAccountSelectorList({
      fixture,
      selectedAccountGroups: [account2Group],
      showCheckbox: true,
      showFooter: false,
    });

    expect(
      await findByTestId(
        `${ACCOUNT_LIST_CELL_TEST_IDS.ACCOUNT_LIST_CELL}${account2Group.id}`,
      ),
    ).toBeOnTheScreen();
  });

  it('enables keyboard avoidance when the filtered list has two or fewer accounts', async () => {
    const setKeyboardAvoidingViewEnabled = jest.fn();
    const { getByTestId } = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
      }),
      setKeyboardAvoidingViewEnabled,
      showFooter: false,
    });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      MULTICHAIN_TEST_ACCOUNTS.account2.name,
    );

    await waitFor(() => {
      expect(setKeyboardAvoidingViewEnabled).toHaveBeenLastCalledWith(true);
    });
  });

  it('selects a valid external address when no wallet account matches the search', async () => {
    const onSelectExternalAccount = jest.fn();
    const { getByTestId, findByTestId, findByText } =
      renderMultichainAccountSelectorList({
        chainId: '0x1',
        onSelectExternalAccount,
        showExternalAccountOnEmptySearch: true,
        showFooter: false,
      });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      EXTERNAL_ADDRESS,
    );

    expect(await findByText('External account')).toBeOnTheScreen();
    fireEvent.press(
      await findByTestId(EXTERNAL_ACCOUNT_CELL_TEST_IDS.CONTAINER),
    );

    expect(onSelectExternalAccount).toHaveBeenCalledWith(EXTERNAL_ADDRESS);
  });

  it('shows an error and disables external account selection for an invalid address', async () => {
    const onSelectExternalAccount = jest.fn();
    const { getByTestId, findByTestId } = renderMultichainAccountSelectorList({
      chainId: '0x1',
      onSelectExternalAccount,
      showExternalAccountOnEmptySearch: true,
      showFooter: false,
    });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      'not-an-address',
    );

    expect(
      await findByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_ERROR_TESTID),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(EXTERNAL_ACCOUNT_CELL_TEST_IDS.CONTAINER),
    );

    expect(onSelectExternalAccount).not.toHaveBeenCalled();
  });

  it('gracefully handles adding accounts with activity and synced accounts', async () => {
    const { getByTestId, getByText } = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
        includeActivityAccount: true,
      }),
      showFooter: false,
    });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      'Account',
    );

    await waitFor(() => {
      expect(
        getByText(MULTICHAIN_TEST_ACCOUNTS.account1.name),
      ).toBeOnTheScreen();
      expect(
        getByText(MULTICHAIN_TEST_ACCOUNTS.account2.name),
      ).toBeOnTheScreen();
      expect(
        getByText(MULTICHAIN_TEST_ACCOUNTS.activityAccount.name),
      ).toBeOnTheScreen();
    });
  });

  it('syncs new accounts when account sync is enabled and excludes accounts created when sync is disabled', async () => {
    const currentAppState = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
        includeActivityAccount: true,
      }),
      showFooter: false,
    });

    fireEvent.changeText(
      currentAppState.getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      ),
      MULTICHAIN_TEST_ACCOUNTS.activityAccount.name,
    );

    expect(
      await currentAppState.findByText(
        MULTICHAIN_TEST_ACCOUNTS.activityAccount.name,
      ),
    ).toBeOnTheScreen();
    currentAppState.unmount();

    const freshSyncedState = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
        includeActivityAccount: false,
      }),
      showFooter: false,
    });

    fireEvent.changeText(
      freshSyncedState.getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      ),
      MULTICHAIN_TEST_ACCOUNTS.activityAccount.name,
    );

    await waitFor(() => {
      expect(
        freshSyncedState.queryByText(
          MULTICHAIN_TEST_ACCOUNTS.activityAccount.name,
        ),
      ).not.toBeOnTheScreen();
      expect(
        freshSyncedState.getByTestId(
          MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('retrieves added, renamed, and subsequently added accounts from fresh synced state', async () => {
    const fixture = buildMultichainAccountsFixture({
      includeSecondAccount: true,
      includeActivityAccount: true,
    });
    renameGroup(fixture, 'account2', 'RENAMED ACCOUNT');

    const { getByTestId, findByText, queryByText } =
      renderMultichainAccountSelectorList({
        fixture,
        showFooter: false,
      });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      'Account',
    );

    expect(
      await findByText(MULTICHAIN_TEST_ACCOUNTS.account1.name),
    ).toBeOnTheScreen();
    expect(await findByText('RENAMED ACCOUNT')).toBeOnTheScreen();
    expect(
      await findByText(MULTICHAIN_TEST_ACCOUNTS.activityAccount.name),
    ).toBeOnTheScreen();
    expect(
      queryByText(MULTICHAIN_TEST_ACCOUNTS.account2.name),
    ).not.toBeOnTheScreen();
  });

  it('does not sync imported accounts and excludes them when logging into a fresh app instance', async () => {
    const withImportedAccount = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
        includeImportedAccount: true,
      }),
      showFooter: false,
    });

    fireEvent.changeText(
      withImportedAccount.getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      ),
      MULTICHAIN_TEST_ACCOUNTS.importedAccount.name,
    );

    expect(
      await withImportedAccount.findByText(
        MULTICHAIN_TEST_ACCOUNTS.importedAccount.name,
      ),
    ).toBeOnTheScreen();
    withImportedAccount.unmount();

    const freshSyncedAccounts = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
        includeImportedAccount: false,
      }),
      showFooter: false,
    });

    fireEvent.changeText(
      freshSyncedAccounts.getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      ),
      MULTICHAIN_TEST_ACCOUNTS.importedAccount.name,
    );

    await waitFor(() => {
      expect(
        freshSyncedAccounts.queryByText(
          MULTICHAIN_TEST_ACCOUNTS.importedAccount.name,
        ),
      ).not.toBeOnTheScreen();
      expect(
        freshSyncedAccounts.getByTestId(
          MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('adds accounts across multiple SRPs and syncs them', async () => {
    const createAccountSpy = jest.spyOn(
      Engine.context.MultichainAccountService,
      'createNextMultichainAccountGroup',
    );
    const { getAllByTestId, getByText } = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
        includeSecondSrp: true,
      }),
    });

    expect(
      getByText(MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount2.name),
    ).toBeOnTheScreen();
    fireEvent.press(
      getAllByTestId(AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT)[1],
    );

    await waitFor(() => {
      expect(createAccountSpy).toHaveBeenCalledWith({
        entropySource: 'entropy-source-2',
      });
    });

    createAccountSpy.mockRestore();
  });

  it('retrieves all synced accounts across multiple SRPs after importing the second SRP', async () => {
    const { getAllByText, getByTestId, getAllByTestId, findByText } =
      renderMultichainAccountSelectorList({
        fixture: buildMultichainAccountsFixture({
          includeSecondAccount: true,
          includeSecondSrp: true,
        }),
        showFooter: false,
      });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      'Account',
    );

    await waitFor(() => {
      expect(getAllByTestId(AccountCellIds.CONTAINER)).toHaveLength(4);
      expect(getAllByText(MULTICHAIN_TEST_ACCOUNTS.account1.name)).toHaveLength(
        2,
      );
    });
    expect(
      await findByText(MULTICHAIN_TEST_ACCOUNTS.account2.name),
    ).toBeOnTheScreen();
    expect(
      await findByText(MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount2.name),
    ).toBeOnTheScreen();
  });
});

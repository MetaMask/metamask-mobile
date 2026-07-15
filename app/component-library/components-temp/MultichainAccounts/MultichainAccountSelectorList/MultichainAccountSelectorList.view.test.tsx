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

describeForPlatforms('MultichainAccountSelectorList component view', () => {
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

  it('creates the next account for the first SRP section', async () => {
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

  it('filters accounts by name across account groups', async () => {
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

  it('shows the empty state when no account matches the search', async () => {
    const { getByTestId, queryAllByTestId } =
      renderMultichainAccountSelectorList({
        fixture: buildMultichainAccountsFixture({
          includeSecondAccount: true,
        }),
        showFooter: false,
      });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      'No matching account',
    );

    await waitFor(() => {
      expect(
        getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID),
      ).toBeOnTheScreen();
      expect(queryAllByTestId(AccountCellIds.CONTAINER)).toHaveLength(0);
    });
  });

  it('creates the next account for the selected SRP section', async () => {
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

  it('displays accounts from multiple SRP sections', async () => {
    const { getAllByText, getAllByTestId, findByText } =
      renderMultichainAccountSelectorList({
        fixture: buildMultichainAccountsFixture({
          includeSecondAccount: true,
          includeSecondSrp: true,
        }),
        showFooter: false,
      });

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

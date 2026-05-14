import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import {
  renderDeleteAccountWithRoutes,
  renderMultichainAccountSelectorList,
} from '../../../../../../tests/component-view/renderers/multichainAccounts';
import { buildMultichainAccountsFixture } from '../../../../../../tests/component-view/presets/multichainAccounts';
import { MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID } from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.constants';
import { strings } from '../../../../../../locales/i18n';
import { MultichainDeleteAccountSelectors } from './DeleteAccount.testIds';

describeForPlatforms('DeleteAccount multichain account details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes the account', async () => {
    const fixture = buildMultichainAccountsFixture({
      includeImportedAccount: true,
    });
    const importedAccountId = fixture.groups.importedAccount?.accounts[0];
    const importedAccount = importedAccountId
      ? fixture.internalAccounts[importedAccountId]
      : undefined;
    const removeAccountSpy = jest.spyOn(
      Engine.context.KeyringController,
      'removeAccount',
    );
    const { getByTestId, findByTestId, getByText, account } =
      renderDeleteAccountWithRoutes({
        fixture,
        account: importedAccount,
      });

    expect(
      getByTestId(MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        MultichainDeleteAccountSelectors.DELETE_ACCOUNT_WARNING_TITLE,
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(importedAccount?.metadata.name ?? account.metadata.name),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(
        MultichainDeleteAccountSelectors.DELETE_ACCOUNT_REMOVE_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(removeAccountSpy).toHaveBeenCalledWith(account.address);
    });
    expect(
      await findByTestId(getRouteProbeTestId(Routes.WALLET_VIEW)),
    ).toBeOnTheScreen();
  });

  it('cancels deletion without removing the account', () => {
    const fixture = buildMultichainAccountsFixture({
      includeImportedAccount: true,
    });
    const importedAccountId = fixture.groups.importedAccount?.accounts[0];
    const importedAccount = importedAccountId
      ? fixture.internalAccounts[importedAccountId]
      : undefined;
    const removeAccountSpy = jest.spyOn(
      Engine.context.KeyringController,
      'removeAccount',
    );
    const { getByTestId } = renderDeleteAccountWithRoutes({
      fixture,
      account: importedAccount,
    });

    fireEvent.press(
      getByTestId(
        MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CANCEL_BUTTON,
      ),
    );

    expect(removeAccountSpy).not.toHaveBeenCalled();
  });

  it('shows an error and stays on the delete sheet when account removal fails', async () => {
    (
      Engine.context.KeyringController.removeAccount as jest.Mock
    ).mockRejectedValueOnce(new Error('Delete failed'));
    const fixture = buildMultichainAccountsFixture({
      includeImportedAccount: true,
    });
    const importedAccountId = fixture.groups.importedAccount?.accounts[0];
    const importedAccount = importedAccountId
      ? fixture.internalAccounts[importedAccountId]
      : undefined;
    const { getByTestId, getByText, queryByTestId } =
      renderDeleteAccountWithRoutes({
        fixture,
        account: importedAccount,
      });

    fireEvent.press(
      getByTestId(
        MultichainDeleteAccountSelectors.DELETE_ACCOUNT_REMOVE_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        getByText(strings('multichain_accounts.delete_account.error')),
      ).toBeOnTheScreen();
    });
    expect(
      queryByTestId(getRouteProbeTestId(Routes.WALLET_VIEW)),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER),
    ).toBeOnTheScreen();
  });

  it('removes the imported accounts section from the account list after deletion', async () => {
    const { getByTestId, queryByText } = renderMultichainAccountSelectorList({
      fixture: buildMultichainAccountsFixture({
        includeSecondAccount: true,
        includeImportedAccount: false,
      }),
      showFooter: false,
    });

    fireEvent.changeText(
      getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID),
      'Account',
    );

    await waitFor(() => {
      expect(queryByText('Imported Accounts')).not.toBeOnTheScreen();
    });
  });
});

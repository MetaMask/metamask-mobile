import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { renderDeleteAccountWithRoutes } from '../../../../../../tests/component-view/renderers/multichainAccounts';
import { buildMultichainAccountsFixture } from '../../../../../../tests/component-view/presets/multichainAccounts';
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

  it('does not remove an HD account', async () => {
    const fixture = buildMultichainAccountsFixture();
    const removeAccountSpy = jest.spyOn(
      Engine.context.KeyringController,
      'removeAccount',
    );
    const { getByTestId, queryByTestId } = renderDeleteAccountWithRoutes({
      fixture,
      account: fixture.internalAccounts[fixture.groups.account1.accounts[0]],
    });

    fireEvent.press(
      getByTestId(
        MultichainDeleteAccountSelectors.DELETE_ACCOUNT_REMOVE_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(removeAccountSpy).not.toHaveBeenCalled();
      expect(
        queryByTestId(getRouteProbeTestId(Routes.WALLET_VIEW)),
      ).not.toBeOnTheScreen();
      expect(
        getByTestId(MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER),
      ).toBeOnTheScreen();
    });
  });
});

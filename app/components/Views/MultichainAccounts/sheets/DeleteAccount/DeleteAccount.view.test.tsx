import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderDeleteAccountWithRoutes,
  renderMultichainAccountSelectorList,
} from '../../../../../../tests/component-view/renderers/multichainAccounts';
import { buildMultichainAccountsFixture } from '../../../../../../tests/component-view/presets/multichainAccounts';
import { MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID } from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.constants';
import { MultichainDeleteAccountSelectors } from './DeleteAccount.testIds';

describeForPlatforms('DeleteAccount multichain account details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const { getByTestId, findByTestId, account } =
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
      expect(removeAccountSpy).toHaveBeenCalledWith(account.address);
    });
    expect(await findByTestId(`route-${Routes.WALLET_VIEW}`)).toBeOnTheScreen();

    removeAccountSpy.mockRestore();
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

import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { getRouteParamsProbeTestId } from '../../../../../tests/component-view/render';
import { renderAccountGroupDetailsWithRoutes } from '../../../../../tests/component-view/renderers/multichainAccounts';
import { buildMultichainAccountsFixture } from '../../../../../tests/component-view/presets/multichainAccounts';
import { AccountDetailsIds } from '../AccountDetails.testIds';
import { EditAccountNameIds } from '../sheets/EditAccountName.testIds';
import { strings } from '../../../../../locales/i18n';

describeForPlatforms('Multichain account group details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renames the account', async () => {
    const setAccountGroupNameSpy = jest.spyOn(
      Engine.context.AccountTreeController,
      'setAccountGroupName',
    );
    const { getByTestId, findByTestId, fixture } =
      renderAccountGroupDetailsWithRoutes();

    fireEvent.press(getByTestId(AccountDetailsIds.ACCOUNT_NAME_LINK));

    const input = await findByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
    expect(input.props.value).toBe(fixture.groups.account1.metadata.name);

    fireEvent.changeText(input, 'Account 1-edited');
    fireEvent.press(await findByTestId(EditAccountNameIds.SAVE_BUTTON));

    await waitFor(() => {
      expect(setAccountGroupNameSpy).toHaveBeenCalledWith(
        fixture.groups.account1.id,
        'Account 1-edited',
      );
    });
  });

  it('keeps the edit sheet open and does not rename when the account name is blank', async () => {
    const setAccountGroupNameSpy = jest.spyOn(
      Engine.context.AccountTreeController,
      'setAccountGroupName',
    );
    const { getByTestId, findByTestId, getByText } =
      renderAccountGroupDetailsWithRoutes();

    fireEvent.press(getByTestId(AccountDetailsIds.ACCOUNT_NAME_LINK));
    fireEvent.changeText(
      await findByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT),
      '   ',
    );
    fireEvent.press(await findByTestId(EditAccountNameIds.SAVE_BUTTON));

    expect(setAccountGroupNameSpy).not.toHaveBeenCalled();
    expect(
      getByText(
        strings('multichain_accounts.edit_account_name.error_empty_name'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER),
    ).toBeOnTheScreen();
  });

  it('shows duplicate name validation when account rename is rejected', async () => {
    (
      Engine.context.AccountTreeController.setAccountGroupName as jest.Mock
    ).mockImplementationOnce(() => {
      throw new Error('name already exists');
    });
    const { getByTestId, findByTestId, getByText, fixture } =
      renderAccountGroupDetailsWithRoutes();

    fireEvent.press(getByTestId(AccountDetailsIds.ACCOUNT_NAME_LINK));
    fireEvent.changeText(
      await findByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT),
      'Account 2',
    );
    fireEvent.press(await findByTestId(EditAccountNameIds.SAVE_BUTTON));

    expect(
      Engine.context.AccountTreeController.setAccountGroupName,
    ).toHaveBeenCalledWith(fixture.groups.account1.id, 'Account 2');
    expect(
      getByText(
        strings('multichain_accounts.edit_account_name.error_duplicate_name'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER),
    ).toBeOnTheScreen();
  });

  it('opens account addresses from account details with the selected account group', async () => {
    const { getByTestId, findByTestId, fixture } =
      renderAccountGroupDetailsWithRoutes();
    const addressListRouteParamsTestId = getRouteParamsProbeTestId(
      Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST,
    );

    fireEvent.press(getByTestId(AccountDetailsIds.NETWORKS_LINK));

    expect(await findByTestId(addressListRouteParamsTestId)).toBeOnTheScreen();
    await waitFor(() => {
      expect(getByTestId(addressListRouteParamsTestId).props.children).toEqual(
        expect.stringContaining(fixture.groups.account1.id),
      );
    });
  });

  it('opens private key list from account details with the selected account group', async () => {
    const { getByTestId, findByTestId, fixture } =
      renderAccountGroupDetailsWithRoutes();
    const privateKeyListRouteParamsTestId = getRouteParamsProbeTestId(
      Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST,
    );

    fireEvent.press(getByTestId(AccountDetailsIds.PRIVATE_KEYS_LINK));

    expect(
      await findByTestId(privateKeyListRouteParamsTestId),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(privateKeyListRouteParamsTestId).props.children,
      ).toEqual(expect.stringContaining(fixture.groups.account1.id));
    });
  });

  it('opens delete account flow for an imported account from account details', async () => {
    const fixture = buildMultichainAccountsFixture({
      includeImportedAccount: true,
    });
    const { getByTestId, findByTestId } = renderAccountGroupDetailsWithRoutes({
      fixture,
      accountGroup: fixture.groups.importedAccount,
    });
    const accountDetailActionsRouteParamsTestId = getRouteParamsProbeTestId(
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
    );

    fireEvent.press(getByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON));

    expect(
      await findByTestId(accountDetailActionsRouteParamsTestId),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(accountDetailActionsRouteParamsTestId).props.children,
      ).toEqual(
        expect.stringContaining(
          Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
        ),
      );
    });
  });

  it('hides remove account action during seedless onboarding login flow', () => {
    const { queryByTestId } = renderAccountGroupDetailsWithRoutes({
      overrides: {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'seedless-vault',
            },
          },
        },
      },
    });

    expect(
      queryByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON),
    ).not.toBeOnTheScreen();
  });
});

import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderAccountGroupDetailsWithRoutes } from '../../../../../tests/component-view/renderers/multichainAccounts';
import { AccountDetailsIds } from '../AccountDetails.testIds';
import { EditAccountNameIds } from '../sheets/EditAccountName.testIds';

describeForPlatforms('Multichain account group details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    fireEvent.changeText(input, 'Account 1-edited');
    fireEvent.press(await findByTestId(EditAccountNameIds.SAVE_BUTTON));

    await waitFor(() => {
      expect(setAccountGroupNameSpy).toHaveBeenCalledWith(
        fixture.groups.account1.id,
        'Account 1-edited',
      );
    });

    setAccountGroupNameSpy.mockRestore();
  });
});

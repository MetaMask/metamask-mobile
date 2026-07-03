import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderPrivateKeyList } from '../../../../../tests/component-view/renderers/multichainAccounts';
import { MULTICHAIN_TEST_ACCOUNTS } from '../../../../../tests/component-view/presets/multichainAccounts';
import { formatAddress } from '../../../../util/address';
import {
  MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_TEST_ID,
} from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { PrivateKeyListIds } from './PrivateKeyList.testIds';

describeForPlatforms('PrivateKeyList multichain accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      Engine.context.KeyringController.verifyPassword as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.KeyringController.exportAccount as jest.Mock
    ).mockImplementation((_password: string, address: string) =>
      Promise.resolve(`mock-private-key-for-${address}`),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps private keys hidden when password verification fails', async () => {
    (
      Engine.context.KeyringController.verifyPassword as jest.Mock
    ).mockRejectedValueOnce(new Error('Wrong password'));
    const { getByTestId, findByTestId, queryByTestId } = renderPrivateKeyList();

    expect(getByTestId(PrivateKeyListIds.BANNER)).toBeOnTheScreen();
    expect(getByTestId(PrivateKeyListIds.PASSWORD_INPUT)).toBeOnTheScreen();
    expect(getByTestId(PrivateKeyListIds.CONTINUE_BUTTON)).toBeOnTheScreen();

    fireEvent.changeText(
      getByTestId(PrivateKeyListIds.PASSWORD_INPUT),
      'wrong-password',
    );
    fireEvent.press(getByTestId(PrivateKeyListIds.CONTINUE_BUTTON));

    expect(
      await findByTestId(PrivateKeyListIds.PASSWORD_ERROR),
    ).toBeOnTheScreen();
    expect(queryByTestId(PrivateKeyListIds.LIST)).not.toBeOnTheScreen();
  });

  it('reveals complete exportable account rows after password verification succeeds', async () => {
    const verifyPasswordSpy = jest.spyOn(
      Engine.context.KeyringController,
      'verifyPassword',
    );
    const exportAccountSpy = jest.spyOn(
      Engine.context.KeyringController,
      'exportAccount',
    );
    const { getByTestId, findByTestId, findAllByTestId } =
      renderPrivateKeyList();

    fireEvent.changeText(
      getByTestId(PrivateKeyListIds.PASSWORD_INPUT),
      'correct-password',
    );
    fireEvent.press(getByTestId(PrivateKeyListIds.CONTINUE_BUTTON));

    expect(await findByTestId(PrivateKeyListIds.LIST)).toBeOnTheScreen();

    await waitFor(() => {
      expect(verifyPasswordSpy).toHaveBeenCalledWith('correct-password');
      expect(exportAccountSpy).toHaveBeenCalledWith(
        'correct-password',
        MULTICHAIN_TEST_ACCOUNTS.account1.address,
      );
    });

    const rows = await findAllByTestId(MULTICHAIN_ADDRESS_ROW_TEST_ID);
    expect(rows).toHaveLength(1);

    const accountRow = within(rows[0]);
    expect(
      accountRow.getByTestId(MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID),
    ).toHaveTextContent('Ethereum Main Network');
    expect(
      accountRow.getByTestId(MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID),
    ).toHaveTextContent(
      formatAddress(MULTICHAIN_TEST_ACCOUNTS.account1.address, 'short'),
    );
    expect(
      accountRow.getByTestId(MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID),
    ).toBeOnTheScreen();
  });
});

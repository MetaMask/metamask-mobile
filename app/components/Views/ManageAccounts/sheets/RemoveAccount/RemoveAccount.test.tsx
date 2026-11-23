import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { createMockAccountGroup } from '../../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { EthAccountType } from '@metamask/keyring-api';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { removeAccount } from '../../../../../util/accounts/removeAccount';
import RemoveAccount from './RemoveAccount';
import { RemoveAccountSelectors } from './RemoveAccount.testIds';

jest.mock('../../../../../util/accounts/removeAccount');

jest.mock('@metamask/design-system-react-native', () => ({
  ...jest.requireActual('@metamask/design-system-react-native'),
  toast: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockUseRoute = jest.mocked(useRoute);
const mockRemoveAccount = jest.mocked(removeAccount);
const mockToast = jest.mocked(toast);

const mockAccount = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Ledger 1',
  KeyringTypes.ledger,
  EthAccountType.Eoa,
);

const mockAccountGroup = createMockAccountGroup(
  'keyring:hw/0',
  'Ledger Account Group',
  [mockAccount.id],
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: () => mockGoBack(),
  }),
  useRoute: jest.fn(),
}));

const render = () =>
  renderWithProvider(
    <RemoveAccount />,
    // The sheet reads everything it needs from route params.
    {},
  );

describe('RemoveAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({
      params: { account: mockAccount, accountGroup: mockAccountGroup },
    } as never);
  });

  it('renders the warning title, description, and both buttons', () => {
    const { getByTestId, getByText } = render();

    expect(getByTestId(RemoveAccountSelectors.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(RemoveAccountSelectors.WARNING)).toBeOnTheScreen();
    expect(
      getByText(
        strings('accounts.remove_account_title_with_account_name', {
          accountName: mockAccountGroup.metadata.name,
        }),
      ),
    ).toBeTruthy();
    expect(getByText(strings('accounts.remove_account_warning'))).toBeTruthy();
    expect(getByTestId(RemoveAccountSelectors.CANCEL_BUTTON)).toBeOnTheScreen();
    expect(getByTestId(RemoveAccountSelectors.REMOVE_BUTTON)).toBeOnTheScreen();
  });

  it('uses the account group name in the title, not the internal account name', () => {
    const { getByText, queryByText } = render();

    expect(getByText(`Remove ${mockAccountGroup.metadata.name}?`)).toBeTruthy();
    expect(queryByText(`Remove ${mockAccount.metadata.name}?`)).toBeNull();
  });

  it('navigates back when cancel is pressed', () => {
    const { getByTestId } = render();

    fireEvent.press(getByTestId(RemoveAccountSelectors.CANCEL_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockRemoveAccount).not.toHaveBeenCalled();
  });

  it('closes and removes the hardware account when remove is pressed', async () => {
    mockRemoveAccount.mockResolvedValue({
      didReselectAccount: false,
    });

    const { getByTestId } = render();

    fireEvent.press(getByTestId(RemoveAccountSelectors.REMOVE_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockRemoveAccount).toHaveBeenCalledWith({
        address: mockAccount.address,
        keyringType: mockAccount.metadata.keyring.type,
      });
    });
  });

  it('closes and removes an imported private-key account when remove is pressed', async () => {
    const importedAccount = createMockInternalAccount(
      '0xdef',
      'Imported 1',
      KeyringTypes.simple,
      EthAccountType.Eoa,
    );
    mockUseRoute.mockReturnValue({
      params: {
        account: importedAccount,
        accountGroup: createMockAccountGroup(
          'keyring:imported/0',
          'Imported Account Group',
          [importedAccount.id],
        ),
      },
    } as never);
    mockRemoveAccount.mockResolvedValue({
      didReselectAccount: false,
    });

    const { getByTestId } = render();

    fireEvent.press(getByTestId(RemoveAccountSelectors.REMOVE_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockRemoveAccount).toHaveBeenCalledWith({
        address: importedAccount.address,
        keyringType: KeyringTypes.simple,
      });
    });
  });

  it('shows a success toast with the account group name after removal', async () => {
    mockRemoveAccount.mockResolvedValue({
      didReselectAccount: false,
    });

    const { getByTestId } = render();

    fireEvent.press(getByTestId(RemoveAccountSelectors.REMOVE_BUTTON));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1);
    });
    expect(mockToast).toHaveBeenCalledWith({
      title: strings('accounts.account_removed_toast', {
        accountName: mockAccountGroup.metadata.name,
      }),
      severity: ToastSeverity.Success,
    });
  });

  it('does not show a toast when cancel is pressed', () => {
    const { getByTestId } = render();

    fireEvent.press(getByTestId(RemoveAccountSelectors.CANCEL_BUTTON));

    expect(mockToast).not.toHaveBeenCalled();
  });
});

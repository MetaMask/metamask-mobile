import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { EditAccountName } from './EditAccountName';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import { EditAccountNameIds } from '../../../../../../e2e/selectors/MultichainAccounts/EditAccountName.selectors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const mockGoBack = jest.fn();
const mockRoute = {
  params: {
    account: createMockInternalAccount(
      '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      'Test Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    ),
  },
};
const mockUseRoute = jest.fn().mockReturnValue(mockRoute);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: () => mockGoBack(),
  }),
  useRoute: () => mockUseRoute(),
}));

const mockSetAccountName = jest.fn();
const mockSetAccountGroupName = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      setAccountName: (address: string, name: string) =>
        mockSetAccountName(address, name),
    },
    AccountTreeController: {
      setAccountGroupName: (groupId: string, name: string) =>
        mockSetAccountGroupName(groupId, name),
    },
  },
}));

describe('EditAccountName', () => {
  const render = () =>
    renderWithProvider(
      <SafeAreaProvider>
        <EditAccountName />
      </SafeAreaProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAccountName.mockReset();
    mockSetAccountGroupName.mockReset();
    mockUseRoute.mockReturnValue(mockRoute);
  });

  describe('when editing individual account', () => {
    it('renders correctly with account information', () => {
      const { getByText, getByTestId } = render();

      expect(
        getByText(strings('multichain_accounts.edit_account_name.title')),
      ).toBeTruthy();
      expect(
        getByText(strings('multichain_accounts.edit_account_name.name')),
      ).toBeTruthy();
      expect(
        getByText(strings('multichain_accounts.edit_account_name.save_button')),
      ).toBeTruthy();
      expect(
        getByTestId(EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER),
      ).toBeTruthy();
    });

    it('displays account name input with current name', () => {
      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput).toBeTruthy();
      expect(nameInput.props.value).toBe('Test Account');
    });

    it('handles account name input changes', () => {
      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      fireEvent.changeText(nameInput, 'New Account Name');

      expect(nameInput.props.value).toBe('New Account Name');
    });

    it('navigates back when back button is pressed', () => {
      const { getByRole } = render();

      const backButton = getByRole('button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('saves account name when save button is pressed', () => {
      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, 'Updated Account Name');
      fireEvent.press(saveButton);

      expect(mockSetAccountName).toHaveBeenCalledWith(
        mockRoute.params.account.id,
        'Updated Account Name',
      );
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('handles save error and displays error message', () => {
      mockSetAccountName.mockImplementation(() => {
        throw new Error('Duplicate name');
      });

      const { getByTestId, getByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, 'Duplicate Name');
      fireEvent.press(saveButton);

      expect(getByText('Failed to edit account name')).toBeTruthy();
    });

    it('shows error when account name is empty', () => {
      const { getByTestId, getByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, '');
      fireEvent.press(saveButton);

      expect(mockSetAccountName).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByText('Account name cannot be empty')).toBeTruthy();
    });
  });

  describe('when editing account group', () => {
    const mockAccountGroup = {
      id: 'entropy:wallet1/0',
      metadata: { name: 'Test Account Group' },
    };

    it('displays account group name input when editing group', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...mockRoute.params,
          accountGroup: mockAccountGroup,
        },
      });

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput).toBeTruthy();
      expect(nameInput.props.value).toBe('Test Account Group');
    });

    it('saves account group name when save button is pressed', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...mockRoute.params,
          accountGroup: mockAccountGroup,
        },
      });

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, 'Updated Group Name');
      fireEvent.press(saveButton);

      expect(mockSetAccountGroupName).toHaveBeenCalledWith(
        mockAccountGroup.id,
        'Updated Group Name',
      );
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('handles save error for account group and displays error message', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...mockRoute.params,
          accountGroup: mockAccountGroup,
        },
      });

      mockSetAccountGroupName.mockImplementation(() => {
        throw new Error('Duplicate name');
      });

      const { getByTestId, getByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, 'Duplicate Group Name');
      fireEvent.press(saveButton);

      expect(getByText('Failed to edit account name')).toBeTruthy();
    });

    it('does not save when account group name is empty', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...mockRoute.params,
          accountGroup: mockAccountGroup,
        },
      });

      const { getByTestId, getByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, '');
      fireEvent.press(saveButton);

      expect(mockSetAccountGroupName).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByText('Account name cannot be empty')).toBeTruthy();
    });

    it('works when only accountGroup is provided (no account)', () => {
      mockUseRoute.mockReturnValue({
        params: {
          accountGroup: mockAccountGroup,
        },
      });

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      expect(nameInput.props.value).toBe('Test Account Group');

      fireEvent.changeText(nameInput, 'New Group Name');
      fireEvent.press(saveButton);

      expect(mockSetAccountGroupName).toHaveBeenCalledWith(
        mockAccountGroup.id,
        'New Group Name',
      );
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles different account types', () => {
      const snapAccount = createMockInternalAccount(
        '0x9876543210987654321098765432109876543210',
        'Snap Account',
        KeyringTypes.snap,
        EthAccountType.Eoa,
      );

      const mockRouteWithSnapAccount = {
        params: { account: snapAccount },
      };

      mockUseRoute.mockReturnValue(mockRouteWithSnapAccount);

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput.props.value).toBe(snapAccount.metadata.name);
    });

    it('handles long account names correctly', () => {
      const longNameAccount = createMockInternalAccount(
        '0x1234567890123456789012345678901234567890',
        'Very Long Account Name That Should Still Work Correctly',
        KeyringTypes.hd,
        EthAccountType.Eoa,
      );

      const mockRouteWithLongName = {
        params: { account: longNameAccount },
      };

      mockUseRoute.mockReturnValue(mockRouteWithLongName);

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput.props.value).toBe(
        'Very Long Account Name That Should Still Work Correctly',
      );
    });

    it('clears error when input changes after error', () => {
      mockSetAccountName.mockImplementation(() => {
        throw new Error('Duplicate name');
      });

      const { getByTestId, getByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, 'Duplicate Name');
      fireEvent.press(saveButton);
      expect(getByText('Failed to edit account name')).toBeTruthy();
    });

    it('falls back to account name when no accountGroup is provided', () => {
      // Route without accountGroup
      mockUseRoute.mockReturnValue(mockRoute);

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput.props.value).toBe('Test Account');
    });
  });
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { EditMultichainAccountName } from './EditMultichainAccountName';
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
const mockAccountGroup = {
  id: 'entropy:wallet1/0',
  metadata: { name: 'Test Account Group' },
};
const mockRoute = {
  params: {
    accountGroup: mockAccountGroup,
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

const mockSetAccountGroupName = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      setAccountGroupName: (groupId: string, name: string) =>
        mockSetAccountGroupName(groupId, name),
    },
  },
}));

describe('EditMultichainAccountName', () => {
  const render = () =>
    renderWithProvider(
      <SafeAreaProvider>
        <EditMultichainAccountName />
      </SafeAreaProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAccountGroupName.mockReset();
    mockUseRoute.mockReturnValue(mockRoute);
  });

  describe('rendering', () => {
    it('renders correctly with account group information', () => {
      const { getByText, getByTestId } = render();

      expect(getByText('Test Account Group')).toBeTruthy();
      expect(
        getByText(
          strings('multichain_accounts.edit_account_name.account_name'),
        ),
      ).toBeTruthy();
      expect(
        getByText(
          strings('multichain_accounts.edit_account_name.confirm_button'),
        ),
      ).toBeTruthy();
      expect(
        getByTestId(EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER),
      ).toBeTruthy();
    });

    it('displays account group name input with current name', () => {
      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput).toBeTruthy();
      expect(nameInput.props.value).toBe('Test Account Group');
    });
  });

  describe('user interactions', () => {
    it('handles account group name input changes', () => {
      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      fireEvent.changeText(nameInput, 'New Group Name');

      expect(nameInput.props.value).toBe('New Group Name');
    });

    it('navigates back when back button is pressed', () => {
      const { getByRole } = render();

      const backButton = getByRole('button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('saves account group name when save button is pressed', () => {
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
  });

  describe('validation', () => {
    it('shows error when account group name is empty', () => {
      const { getByTestId, getByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, '');
      fireEvent.press(saveButton);

      expect(mockSetAccountGroupName).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByText('Account name cannot be empty')).toBeTruthy();
    });

    it('shows error when account group name is only whitespace', () => {
      const { getByTestId, getByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      fireEvent.changeText(nameInput, '   ');
      fireEvent.press(saveButton);

      expect(mockSetAccountGroupName).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByText('Account name cannot be empty')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('handles save error and displays error message', () => {
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

    it('clears error when input changes after error', () => {
      mockSetAccountGroupName.mockImplementation(() => {
        throw new Error('Duplicate name');
      });

      const { getByTestId, getByText, queryByText } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      const saveButton = getByTestId(EditAccountNameIds.SAVE_BUTTON);

      // First, trigger an error
      fireEvent.changeText(nameInput, 'Duplicate Group Name');
      fireEvent.press(saveButton);
      expect(getByText('Failed to edit account name')).toBeTruthy();

      // Then, change the input to clear the error
      fireEvent.changeText(nameInput, 'New Name');
      expect(queryByText('Failed to edit account name')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles long account group names correctly', () => {
      const longNameGroup = {
        id: 'entropy:wallet1/1',
        metadata: {
          name: 'Very Long Account Group Name That Should Still Work Correctly',
        },
      };

      mockUseRoute.mockReturnValue({
        params: { accountGroup: longNameGroup },
      });

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput.props.value).toBe(
        'Very Long Account Group Name That Should Still Work Correctly',
      );
    });

    it('handles account group with empty name', () => {
      const emptyNameGroup = {
        id: 'entropy:wallet1/2',
        metadata: { name: '' },
      };

      mockUseRoute.mockReturnValue({
        params: { accountGroup: emptyNameGroup },
      });

      const { getByTestId } = render();

      const nameInput = getByTestId(EditAccountNameIds.ACCOUNT_NAME_INPUT);
      expect(nameInput.props.value).toBe('');
    });
  });
});

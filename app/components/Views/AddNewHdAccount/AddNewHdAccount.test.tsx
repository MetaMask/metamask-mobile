import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import AddNewHdAccount from './AddNewHdAccount';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../util/test/accountsControllerTestUtils';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Engine from '../../../core/Engine';

const mockAddNewHdAccount = jest.fn().mockResolvedValue(null);
const mockOnBack = jest.fn();
jest.mock('../../../actions/multiSrp', () => ({
  addNewHdAccount: (keyringId?: string, name?: string) =>
    mockAddNewHdAccount(keyringId, name),
}));

const mockKeyringMetadata1 = {
  id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
  name: '',
};

const mockKeyringMetadata2 = {
  id: '01JKZ56KRVYEEHC601HSNW28T2',
  name: '',
};

const mockKeyring1 = {
  type: ExtendedKeyringTypes.hd,
  accounts: [internalAccount1.address],
  metadata: mockKeyringMetadata1,
};

const mockKeyring2 = {
  type: ExtendedKeyringTypes.hd,
  accounts: [internalAccount2.address],
  metadata: mockKeyringMetadata2,
};

const mockNextAccountName = 'Account 3';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        keyrings: [mockKeyring1, mockKeyring2],
        keyringsMetadata: [mockKeyringMetadata1, mockKeyringMetadata2],
      },
    },
  },
};

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      AccountsController: {
        state: mockAccountsControllerState,
        getNextAvailableAccountName: () =>
          jest.fn().mockReturnValue(mockNextAccountName),
      },
    },
  };
});

jest.mocked(Engine);

describe('AddNewHdAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows next available account name as placeholder', () => {
    const { getByPlaceholderText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );
    expect(getByPlaceholderText(mockNextAccountName)).toBeDefined();
  });

  it('handles account name input', () => {
    const { getByPlaceholderText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const input = getByPlaceholderText(mockNextAccountName);
    fireEvent.changeText(input, 'My New Account');
    expect(input.props.value).toBe('My New Account');
  });

  it('shows SRP list when selector is clicked', () => {
    const { getByText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const srpSelector = getByText(
      strings('accounts.select_secret_recovery_phrase'),
    );
    fireEvent.press(srpSelector);

    expect(
      getByText(strings('accounts.select_secret_recovery_phrase')),
    ).toBeDefined();
  });

  it('handles SRP selection', async () => {
    const { getByText, queryByText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const srpSelector = getByText(
      strings('accounts.select_secret_recovery_phrase'),
    );
    fireEvent.press(srpSelector);

    // clicking the second srp will display the srp list
    // it is also the current selected account
    const secondSRP = getByText('Secret Recovery Phrase 2');
    fireEvent.press(secondSRP);

    fireEvent.press(secondSRP);

    // The picker will now only show the second srp.
    expect(queryByText('Secret Recovery Phrase 1')).toBeNull();
  });

  it('handles account creation', async () => {
    const { getByText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const addButton = getByText(strings('accounts.add'));
    fireEvent.press(addButton);

    expect(mockAddNewHdAccount).toHaveBeenCalledWith(
      mockKeyringMetadata2.id,
      mockNextAccountName,
    );
  });

  it('handles account creation with custom name', async () => {
    const { getByText, getByPlaceholderText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const input = getByPlaceholderText(mockNextAccountName);
    fireEvent.changeText(input, 'My Custom Account');

    const addButton = getByText(strings('accounts.add'));
    fireEvent.press(addButton);

    expect(mockAddNewHdAccount).toHaveBeenCalledWith(
      mockKeyringMetadata2.id,
      'My Custom Account',
    );
  });

  it('handles cancellation', () => {
    const { getByText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const cancelButton = getByText(strings('accounts.cancel'));
    fireEvent.press(cancelButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('handles back navigation from SRP list', () => {
    const { getByText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const srpSelector = getByText(
      strings('accounts.select_secret_recovery_phrase'),
    );
    fireEvent.press(srpSelector);

    const backButton = getByText(
      strings('accounts.select_secret_recovery_phrase'),
    );
    fireEvent.press(backButton);

    expect(getByText(strings('account_actions.add_account'))).toBeDefined();
  });

  it('handles error during account creation', async () => {
    const mockError = new Error('Failed to create account');
    mockAddNewHdAccount.mockRejectedValueOnce(mockError);

    const { getByText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    const addButton = getByText(strings('accounts.add'));
    await fireEvent.press(addButton);

    expect(mockOnBack).not.toHaveBeenCalled();
  });
});

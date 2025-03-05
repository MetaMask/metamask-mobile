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
import { TextMatch } from '@testing-library/react-native/build/matches';
import {
  CommonQueryOptions,
  TextMatchOptions,
} from '@testing-library/react-native/build/queries/options';
import { GetByQuery } from '@testing-library/react-native/build/queries/makeQueries';
import { SHEET_HEADER_BACK_BUTTON_ID } from '../../../component-library/components/Sheet/SheetHeader/SheetHeader.constants';

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

const openSrpSelectorList = async (
  getByText: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>,
) => {
  const srpSelector = getByText(
    `${strings('accounts.secret_recovery_phrase')} 1`,
  );

  await fireEvent.press(srpSelector);
};

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

  it('shows SRP list when selector is clicked', async () => {
    const { getByText } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    await openSrpSelectorList(getByText);

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

    await openSrpSelectorList(getByText);

    const secondSRP = getByText('Secret Recovery Phrase 2');
    fireEvent.press(secondSRP);

    // The picker will now only show the second srp.
    expect(queryByText('Secret Recovery Phrase 1')).toBeNull();
    expect(secondSRP).toBeDefined();
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
      mockNextAccountName,
      mockKeyringMetadata1.id,
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
      'My Custom Account',
      mockKeyringMetadata1.id,
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

  it('handles back navigation from SRP list', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AddNewHdAccount onBack={mockOnBack} />,
      {
        state: initialState,
      },
    );

    await openSrpSelectorList(getByText);

    const backButton = getByTestId(SHEET_HEADER_BACK_BUTTON_ID);
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

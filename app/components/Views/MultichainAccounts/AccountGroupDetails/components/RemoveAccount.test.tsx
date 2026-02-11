import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { RemoveAccount } from './RemoveAccount';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import { AccountDetailsIds } from '../../AccountDetails.testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockAccount = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Test Account',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

describe('RemoveAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with account', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <RemoveAccount account={mockAccount} />,
    );

    expect(
      getByText(strings('multichain_accounts.account_details.remove_account')),
    ).toBeTruthy();
    expect(getByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON)).toBeTruthy();
  });

  it('navigates to delete account modal when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <RemoveAccount account={mockAccount} />,
    );

    const button = getByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON);
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledWith(
      'MultichainAccountDetailActions',
      {
        screen: 'DeleteAccount',
        params: { account: mockAccount },
      },
    );
  });
});

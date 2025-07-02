import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RemoveAccount } from './RemoveAccount';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';

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
  it('should render correctly', () => {
    const { getByText } = render(<RemoveAccount account={mockAccount} />);

    expect(
      getByText(strings('multichain_accounts.delete_account.title')),
    ).toBeTruthy();
  });

  it('should navigate to delete account screen on button press', () => {
    const { getByText } = render(<RemoveAccount account={mockAccount} />);

    const deleteButton = getByText(
      strings('multichain_accounts.delete_account.title'),
    );

    fireEvent.press(deleteButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
        params: { account: mockAccount },
      },
    );
  });
});

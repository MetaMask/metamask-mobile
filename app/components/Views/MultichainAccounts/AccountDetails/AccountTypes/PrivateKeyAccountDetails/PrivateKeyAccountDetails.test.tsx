import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PrivateKeyAccountDetails } from './PrivateKeyAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { MultichainDeleteAccountsSelectors } from '../../../../../../../e2e/specs/multichainAccounts/delete-account';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockAccount = createMockInternalAccount(
  '0x1234567890123456789012345678901234567890',
  'Private Key Account',
  KeyringTypes.simple,
  EthAccountType.Eoa,
);

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
};

describe('PrivateKeyAccountDetails', () => {
  it('renders BaseAccountDetails wrapper', () => {
    const { getByTestId } = renderWithProvider(
      <PrivateKeyAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('renders RemoveAccount component', () => {
    const { getByTestId } = renderWithProvider(
      <PrivateKeyAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(MultichainDeleteAccountsSelectors.deleteAccountRemoveButton),
    ).toBeTruthy();
  });

  it('renders both child components within BaseAccountDetails', () => {
    const { getByTestId } = renderWithProvider(
      <PrivateKeyAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    const baseAccountDetails = getByTestId(
      AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER,
    );
    const removeAccount = getByTestId(
      MultichainDeleteAccountsSelectors.deleteAccountRemoveButton,
    );

    expect(baseAccountDetails).toBeTruthy();
    expect(removeAccount).toBeTruthy();
  });
});

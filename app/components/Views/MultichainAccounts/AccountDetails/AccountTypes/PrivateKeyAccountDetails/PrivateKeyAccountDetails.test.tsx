import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PrivateKeyAccountDetails } from './PrivateKeyAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';

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

    expect(getByTestId('remove-account')).toBeTruthy();
  });

  it('renders both child components within BaseAccountDetails', () => {
    const { getByTestId } = renderWithProvider(
      <PrivateKeyAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    const baseAccountDetails = getByTestId(
      AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER,
    );
    const exportCredentials = getByTestId('export-credentials');
    const removeAccount = getByTestId('remove-account');

    expect(baseAccountDetails).toBeTruthy();
    expect(exportCredentials).toBeTruthy();
    expect(removeAccount).toBeTruthy();
  });

  it('handles different account types', () => {
    const differentAccount = createMockInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Another Private Key Account',
      KeyringTypes.simple,
      EthAccountType.Eoa,
    );

    const { getByTestId, getByText } = renderWithProvider(
      <PrivateKeyAccountDetails account={differentAccount} />,
      { state: mockInitialState },
    );

    expect(getByText(differentAccount.metadata.name)).toBeTruthy();
    expect(getByTestId('export-credentials')).toBeTruthy();
    expect(getByTestId('remove-account')).toBeTruthy();
  });
});

import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PrivateKeyAccountDetails } from './PrivateKeyAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { MultichainDeleteAccountsSelectors } from '../../../../../../../e2e/specs/multichainAccounts/delete-account';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ExportCredentialsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/ExportCredentials.selectors';

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
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockAccount.id]: mockAccount,
          },
        },
      },
      KeyringController: {
        keyrings: [
          {
            accounts: [mockAccount.address],
            type: KeyringTypes.simple,
            metadata: {
              id: 'mock-id',
              name: 'mock-name',
            },
          },
          {
            accounts: [],
            type: KeyringTypes.hd,
            metadata: {
              id: 'mock-id-hd',
              name: 'mock-name-hd',
            },
          },
        ],
      },
    },
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

  it('only renders show private key', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PrivateKeyAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON),
    ).toBeTruthy();
    expect(queryByTestId(ExportCredentialsIds.EXPORT_SRP_BUTTON)).toBeNull();
  });
});

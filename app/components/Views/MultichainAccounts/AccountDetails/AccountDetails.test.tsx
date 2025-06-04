import React from 'react';
import { AccountDetails } from './AccountDetails';
import {
  createMockInternalAccount,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { formatAddress } from '../../../../util/address';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockAddress = '0x67B2fAf7959fB61eb9746571041476Bbd0672569';
const mockAccount = createMockInternalAccount(
  mockAddress,
  'Test Account',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const renderWithAccount = (account: InternalAccount | undefined) => {
  const mockRoute = {
    params: {
      account: account || mockAccount,
    },
  };

  const mockAccountsState = account
    ? {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          accounts: {
            [account.id]: account,
          },
        },
      }
    : MOCK_ACCOUNTS_CONTROLLER_STATE;

  return renderWithProvider(<AccountDetails route={mockRoute} />, {
    state: {
      engine: {
        backgroundState: {
          AccountsController: mockAccountsState,
          KeyringController: {
            keyrings: [
              {
                type: KeyringTypes.hd,
                accounts: [mockAccount.address],
                metadata: {
                  id: 'mock-keyring-id',
                  name: 'mock-keyring-name',
                },
              },
            ],
          },
        },
      },
    },
  });
};

describe('AccountDetails', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('displays account name and address when account is defined', () => {
    const { getAllByText, getByText } = renderWithAccount(mockAccount);

    // 1 for the title and 1 for the account name
    expect(getAllByText(mockAccount.metadata.name)).toHaveLength(2);
    expect(getByText(formatAddress(mockAccount.address, 'short'))).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render and navigates away when account is undefined', () => {
    const { queryByText } = renderWithAccount(undefined);

    expect(queryByText(mockAccount.metadata.name)).toBeNull();
    expect(mockNavigate).toHaveBeenCalled();
  });
});

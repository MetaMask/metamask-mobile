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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('../../confirmations/hooks/7702/useEIP7702Networks', () => ({
  useEIP7702Networks: jest.fn().mockReturnValue({
    network7702List: [],
    networkSupporting7702Present: false,
    pending: false,
  }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
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

  // Create proper state that includes the account in the AccountsController
  const mockAccountsState = account
    ? {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          accounts: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
            [account.id]: account,
          },
        },
      }
    : MOCK_ACCOUNTS_CONTROLLER_STATE;

  return renderWithProvider(
    <SafeAreaProvider>
      <AccountDetails route={mockRoute} />
    </SafeAreaProvider>,
    {
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
        settings: {
          avatarAccountType: AvatarAccountType.Maskicon,
        },
      },
    },
  );
};

describe('AccountDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays account name and address when account is defined', () => {
    const { getAllByText, getByText } = renderWithAccount(mockAccount);

    // 1 for the title and 1 for the account name section
    expect(getAllByText(mockAccount.metadata.name)).toHaveLength(2);
    expect(getByText(formatAddress(mockAccount.address, 'short'))).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render when account is undefined and navigates away', () => {
    // Create a route with an account that won't be found in the state
    const nonExistentAccount = createMockInternalAccount(
      '0x0000000000000000000000000000000000000000',
      'Non-existent Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const mockRoute = {
      params: {
        account: nonExistentAccount,
      },
    };

    renderWithProvider(
      <SafeAreaProvider>
        <AccountDetails route={mockRoute} />
      </SafeAreaProvider>,
      {
        state: {
          engine: {
            backgroundState: {
              AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE, // Don't include the non-existent account
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
          settings: {
            avatarAccountType: AvatarAccountType.Maskicon,
          },
        },
      },
    );

    expect(mockNavigate).toHaveBeenCalledWith('AccountSelector');
  });
});

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import AddNewAccount from './AddNewAccount';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../util/test/accountsControllerTestUtils';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Engine from '../../../core/Engine';
import { AddNewAccountProps } from './AddNewAccount.types';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { MultichainNetwork } from '@metamask/multichain-transactions-controller';
import { RootState } from '../../../reducers';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AddNewAccountIds } from '../../../../e2e/selectors/MultiSRP/AddHdAccount.selectors';
import Logger from '../../../util/Logger';

const mockAddNewHdAccount = jest.fn().mockResolvedValue(null);
const mockNavigate = jest.fn();

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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../actions/multiSrp', () => ({
  addNewHdAccount: (keyringId?: string, name?: string) =>
    mockAddNewHdAccount(keyringId, name),
}));

const mockCreateMultichainAccount = jest.fn().mockResolvedValue(null);
const mockMultichainWalletSnapClient = {
  createAccount: mockCreateMultichainAccount,
};

jest.mock('../../../core/SnapKeyring/MultichainWalletSnapClient', () => ({
  ...jest.requireActual('../../../core/SnapKeyring/MultichainWalletSnapClient'),
  MultichainWalletSnapClient: jest
    .fn()
    .mockImplementation(() => mockMultichainWalletSnapClient),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
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
} as unknown as RootState;

const mockGetNextAvailableAccountName = jest
  .fn()
  .mockImplementation((keyringType: KeyringTypes) => {
    switch (keyringType) {
      case KeyringTypes.snap:
        return 'Snap Account 1';
      case KeyringTypes.hd:
        return mockNextAccountName;
      default:
        return mockNextAccountName;
    }
  });

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      AccountsController: {
        state: mockAccountsControllerState,
        getNextAvailableAccountName: (keyringType: KeyringTypes) =>
          mockGetNextAvailableAccountName(keyringType),
      },
    },
  };
});

jest.mocked(Engine);

const render = (
  state: RootState,
  route: AddNewAccountProps['route'] = {},
): ReturnType<typeof renderWithProvider> =>
  renderWithProvider(
    <SafeAreaProvider>
      <AddNewAccount route={route} />
    </SafeAreaProvider>,
    { state },
  );

describe('AddNewAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows next available account name as placeholder', () => {
    const { getByPlaceholderText } = render(initialState, {});

    expect(getByPlaceholderText(mockNextAccountName)).toBeDefined();
  });

  it('handles account name input', () => {
    const { getByPlaceholderText } = render(initialState, {});

    const input = getByPlaceholderText(mockNextAccountName);
    fireEvent.changeText(input, 'My New Account');
    expect(input.props.value).toBe('My New Account');
  });

  it('shows SRP list when selector is clicked', () => {
    const { getByText } = render(initialState, {});

    const srpSelector = getByText(
      strings('accounts.select_secret_recovery_phrase'),
    );
    fireEvent.press(srpSelector);

    expect(
      getByText(strings('accounts.select_secret_recovery_phrase')),
    ).toBeDefined();
  });

  it('handles SRP selection', async () => {
    const { getByText, queryByText } = render(initialState, {});

    const srpSelector = getByText(
      strings('accounts.select_secret_recovery_phrase'),
    );
    fireEvent.press(srpSelector);

    // clicking the second srp will display the srp list
    // it is also the current selected account
    const secondSRP = getByText('Secret Recovery Phrase 2');
    fireEvent.press(secondSRP);

    // We get by text again because we go to the picker and the secondSrp node is unmounted.
    fireEvent.press(getByText('Secret Recovery Phrase 2'));

    // The picker will now only show the second srp.
    expect(queryByText('Secret Recovery Phrase 1')).toBeNull();
  });

  it('handles account creation', async () => {
    const { getByText } = render(initialState, {});

    const addButton = getByText(strings('accounts.add'));
    fireEvent.press(addButton);

    expect(mockAddNewHdAccount).toHaveBeenCalledWith(
      mockKeyringMetadata2.id,
      mockNextAccountName,
    );
  });

  it('handles account creation with custom name', async () => {
    const { getByText, getByPlaceholderText } = render(initialState, {});

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
    const { getByText } = render(initialState, {});

    const cancelButton = getByText(strings('accounts.cancel'));
    fireEvent.press(cancelButton);

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('handles back navigation from SRP list', () => {
    const { getByText } = render(initialState, {});

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

    const { getByText } = render(initialState, {});

    const addButton = getByText(strings('accounts.add'));
    await fireEvent.press(addButton);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe('multichain', () => {
    it.each([
      {
        scope: MultichainNetwork.BitcoinTestnet,
        clientType: WalletClientType.Bitcoin,
        expectedName: 'Bitcoin Testnet Account 1',
      },
      {
        scope: MultichainNetwork.Bitcoin,
        clientType: WalletClientType.Bitcoin,
        expectedName: 'Bitcoin Account 1',
      },
      {
        scope: MultichainNetwork.SolanaDevnet,
        clientType: WalletClientType.Solana,
        expectedName: 'Solana Devnet Account 1',
      },
      {
        scope: MultichainNetwork.SolanaTestnet,
        clientType: WalletClientType.Solana,
        expectedName: 'Solana Testnet Account 1',
      },
      {
        scope: MultichainNetwork.Solana,
        clientType: WalletClientType.Solana,
        expectedName: 'Solana Account 1',
      },
    ])(
      'suggested name is $expectedName for scope: $scope',
      async ({ scope, clientType, expectedName }) => {
        const { getByPlaceholderText } = render(initialState, {
          params: {
            scope,
            clientType,
          },
        });

        const namePlaceholder = getByPlaceholderText(expectedName);

        expect(namePlaceholder).toBeDefined();
      },
    );

    it('calls create account with the MultichainWalletSnapClient', async () => {
      const { getByTestId } = render(initialState, {
        params: {
          scope: MultichainNetwork.Solana,
          clientType: WalletClientType.Solana,
        },
      });

      const addButton = getByTestId(AddNewAccountIds.CONFIRM);
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(
          mockMultichainWalletSnapClient.createAccount,
        ).toHaveBeenCalledWith({
          scope: MultichainNetwork.Solana,
          accountNameSuggestion: 'Solana Account 1',
          entropySource: mockKeyringMetadata2.id,
        });
      });
    });

    it.each([
      {
        scope: MultichainNetwork.Solana,
        clientType: WalletClientType.Solana,
      },
      {
        scope: MultichainNetwork.Bitcoin,
        clientType: WalletClientType.Bitcoin,
      },
    ])(
      'handles error when creating $clientType account fails',
      async ({ scope, clientType }) => {
        mockCreateMultichainAccount.mockRejectedValueOnce(
          new Error(`Failed to create ${clientType} account`),
        );

        const { getByTestId } = render(initialState, {
          params: {
            scope,
            clientType,
          },
        });

        const addButton = getByTestId(AddNewAccountIds.CONFIRM);
        fireEvent.press(addButton);

        await waitFor(() => {
          expect(mockNavigate).not.toHaveBeenCalled();
          expect(Logger.error).toHaveBeenCalledWith(
            expect.any(Error),
            `Failed to create ${clientType} account`,
          );
        });
      },
    );

    it('disables buttons while loading', async () => {
      const { getByTestId } = render(initialState, {
        params: {
          scope: MultichainNetwork.Solana,
          clientType: WalletClientType.Solana,
        },
      });

      const addButton = getByTestId(AddNewAccountIds.CONFIRM);
      fireEvent.press(addButton);

      expect(addButton.props.disabled).toBe(true);
    });
  });
});

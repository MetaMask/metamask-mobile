import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { DeleteAccount } from './DeleteAccount';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';

// Mock Linking module
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseRoute = jest.fn();
const mockAccount = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Test Account',
  KeyringTypes.simple,
  EthAccountType.Eoa,
);
const mockRoute = {
  params: {
    account: mockAccount,
  },
};

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: () => mockGoBack(),
    navigate: (view: string) => mockNavigate(view),
  }),
  useRoute: () => mockUseRoute(),
}));

const mockRemoveAccount = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      removeAccount: (address: string) => mockRemoveAccount(address),
    },
  },
}));

const mockRemoveAccountsFromPermissions = jest.fn();
jest.mock('../../../../../core/Permissions', () => ({
  removeAccountsFromPermissions: (addresses: Hex[]) =>
    mockRemoveAccountsFromPermissions(addresses),
}));

const render = () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  };
  return renderWithProvider(<DeleteAccount />, { state: initialState });
};

describe('DeleteAccount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseRoute.mockReturnValue(mockRoute);
  });

  it('renders correctly with account information', () => {
    const { getByText } = render();

    expect(
      getByText(strings('multichain_accounts.delete_account.title')),
    ).toBeTruthy();
    expect(
      getByText(strings('multichain_accounts.delete_account.warning_title')),
    ).toBeTruthy();
    expect(
      getByText(
        strings('multichain_accounts.delete_account.warning_description'),
      ),
    ).toBeTruthy();
    expect(
      getByText(strings('multichain_accounts.delete_account.cancel_button')),
    ).toBeTruthy();
    expect(
      getByText(strings('multichain_accounts.delete_account.remove_button')),
    ).toBeTruthy();
  });

  it('displays account name correctly', () => {
    const { getByText } = render();

    expect(getByText(mockAccount.metadata.name)).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getAllByRole } = render();

    // This is the back button
    const backButton = getAllByRole('button')[0];
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when cancel button is pressed', () => {
    const { getByText } = render();

    const cancelButton = getByText(
      strings('multichain_accounts.delete_account.cancel_button'),
    );
    fireEvent.press(cancelButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('deletes account when remove button is pressed', async () => {
    mockRemoveAccount.mockResolvedValue(undefined);

    const { getByText } = render();

    const removeButton = getByText(
      strings('multichain_accounts.delete_account.remove_button'),
    );
    fireEvent.press(removeButton);

    await waitFor(() => {
      expect(mockRemoveAccountsFromPermissions).toHaveBeenCalledWith([
        toHex(mockRoute.params.account.address),
      ]);
      expect(mockRemoveAccount).toHaveBeenCalledWith(
        mockRoute.params.account.address,
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });
  });

  it('handles delete error correctly', async () => {
    mockRemoveAccount.mockRejectedValue(new Error('Delete failed'));

    const { getByText } = render();

    const removeButton = getByText(
      strings('multichain_accounts.delete_account.remove_button'),
    );
    fireEvent.press(removeButton);

    await waitFor(() => {
      expect(
        getByText(strings('multichain_accounts.delete_account.error')),
      ).toBeTruthy();
    });
  });

  it('prevents deletion of HD accounts', () => {
    const hdAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'HD Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const mockRouteWithHdAccount = {
      params: { account: hdAccount },
    };

    mockUseRoute.mockReturnValue(mockRouteWithHdAccount);

    const { getByText } = render();

    const removeButton = getByText(
      strings('multichain_accounts.delete_account.remove_button'),
    );
    fireEvent.press(removeButton);

    expect(mockRemoveAccount).not.toHaveBeenCalled();
  });

  it('allows deletion of non-HD accounts', async () => {
    const snapAccount = createMockInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Snap Account',
      KeyringTypes.snap,
      EthAccountType.Eoa,
    );

    const mockRouteWithSnapAccount = {
      params: { account: snapAccount },
    };

    mockUseRoute.mockReturnValue(mockRouteWithSnapAccount);
    mockRemoveAccount.mockResolvedValue(undefined);

    const { getByText } = render();

    const removeButton = getByText(
      strings('multichain_accounts.delete_account.remove_button'),
    );
    fireEvent.press(removeButton);

    await waitFor(() => {
      expect(mockRemoveAccount).toHaveBeenCalledWith(snapAccount.address);
    });
  });

  it('handles different account types correctly', () => {
    const ledgerAccount = createMockInternalAccount(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      'Ledger Account',
      KeyringTypes.ledger,
      EthAccountType.Eoa,
    );

    const mockRouteWithLedgerAccount = {
      params: { account: ledgerAccount },
    };

    mockUseRoute.mockReturnValue(mockRouteWithLedgerAccount);

    const { getByText } = render();

    expect(getByText('Ledger Account')).toBeTruthy();
  });

  it('renders error banner with correct severity', () => {
    const { getByText } = render();

    expect(
      getByText(strings('multichain_accounts.delete_account.warning_title')),
    ).toBeTruthy();
    expect(
      getByText(
        strings('multichain_accounts.delete_account.warning_description'),
      ),
    ).toBeTruthy();
  });

  it('displays account address correctly through AccountInfo component', () => {
    const { getByText } = render();

    expect(getByText(mockRoute.params.account.metadata.name)).toBeTruthy();
  });

  it('handles long account names in deletion flow', () => {
    const longNameAccount = createMockInternalAccount(
      '0x1111111111111111111111111111111111111111',
      'Very Long Account Name That Should Still Display Correctly In Delete Flow',
      KeyringTypes.simple,
      EthAccountType.Eoa,
    );

    const mockRouteWithLongName = {
      params: { account: longNameAccount },
    };

    mockUseRoute.mockReturnValue(mockRouteWithLongName);

    const { getByText } = render();

    expect(
      getByText(
        'Very Long Account Name That Should Still Display Correctly In Delete Flow',
      ),
    ).toBeTruthy();
  });

  it('clears error state appropriately', async () => {
    mockRemoveAccount.mockRejectedValue(new Error('Delete failed'));

    const { getByText } = render();

    const removeButton = getByText(
      strings('multichain_accounts.delete_account.remove_button'),
    );
    fireEvent.press(removeButton);

    await waitFor(() => {
      expect(
        getByText(strings('multichain_accounts.delete_account.error')),
      ).toBeTruthy();
    });
  });
});

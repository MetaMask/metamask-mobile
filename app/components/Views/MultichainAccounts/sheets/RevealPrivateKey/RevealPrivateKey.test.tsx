import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { RevealPrivateKey } from './RevealPrivateKey';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

const mockGoBack = jest.fn();
const mockRoute = {
  params: {
    account: createMockInternalAccount(
      '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      'Test Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    ),
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => mockRoute,
}));

const mockExportAccount = jest.fn();
jest.mock('../../../../../core/Engine/Engine', () => ({
  context: {
    KeyringController: {
      exportAccount: mockExportAccount,
    },
  },
}));

const render = () =>
  renderWithProvider(
    <SafeAreaProvider>
      <RevealPrivateKey />
    </SafeAreaProvider>,
  );

describe('RevealPrivateKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with account information', () => {
    const { getByText, getByPlaceholderText } = render();

    expect(
      getByText(strings('multichain_accounts.reveal_private_key.title')),
    ).toBeTruthy();
    expect(
      getByText(strings('multichain_accounts.reveal_private_key.banner_title')),
    ).toBeTruthy();
    expect(
      getByText(
        strings('multichain_accounts.reveal_private_key.banner_description'),
      ),
    ).toBeTruthy();
    expect(
      getByPlaceholderText(
        strings('multichain_accounts.reveal_private_key.password_placeholder'),
      ),
    ).toBeTruthy();
  });

  it('displays account name correctly', () => {
    const { getByText } = render();

    expect(getByText('Test Account')).toBeTruthy();
  });

  it('handles password input correctly', () => {
    const { getByPlaceholderText } = render();

    const passwordInput = getByPlaceholderText(
      strings('multichain_accounts.reveal_private_key.password_placeholder'),
    );
    fireEvent.changeText(passwordInput, 'test-password');

    expect(passwordInput.props.value).toBe('test-password');
  });

  it('navigates back when back button is pressed', () => {
    const { getByRole } = render();

    const backButton = getByRole('button');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('reveals private key on successful export', async () => {
    const mockPrivateKey = '0xprivatekey123456789';
    mockExportAccount.mockResolvedValue(mockPrivateKey);

    const { getByPlaceholderText } = render();

    const passwordInput = getByPlaceholderText(
      strings('multichain_accounts.reveal_private_key.password_placeholder'),
    );
    fireEvent.changeText(passwordInput, 'correct-password');

    await waitFor(() => {
      expect(mockExportAccount).toHaveBeenCalledWith(
        mockRoute.params.account.address,
        'correct-password',
      );
    });
  });

  it('handles export error correctly', async () => {
    const errorMessage = 'Invalid password';
    mockExportAccount.mockRejectedValue(new Error(errorMessage));

    const { getByPlaceholderText } = render();

    const passwordInput = getByPlaceholderText(
      strings('multichain_accounts.reveal_private_key.password_placeholder'),
    );
    fireEvent.changeText(passwordInput, 'wrong-password');

    await waitFor(() => {
      expect(mockExportAccount).toHaveBeenCalledWith(
        mockRoute.params.account.address,
        'wrong-password',
      );
    });
  });

  it('handles different account types', () => {
    const snapAccount = createMockInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Snap Account',
      KeyringTypes.snap,
      EthAccountType.Eoa,
    );

    const mockRouteWithSnapAccount = {
      params: { account: snapAccount },
    };

    jest
      .mocked(require('@react-navigation/native').useRoute)
      .mockReturnValue(mockRouteWithSnapAccount);

    const { getByText } = render();

    expect(getByText('Snap Account')).toBeTruthy();
  });

  it('shows password input when no private key is revealed', () => {
    const { getByPlaceholderText, queryByText } = render();

    expect(
      getByPlaceholderText(
        strings('multichain_accounts.reveal_private_key.password_placeholder'),
      ),
    ).toBeTruthy();
    expect(queryByText(/0x[a-fA-F0-9]+/)).toBeNull();
  });
});

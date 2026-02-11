import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SecretRecoveryPhrase } from './SecretRecoveryPhrase';
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

// Mock the hook directly in the component file
jest.mock('../../../../hooks/useHdKeyringsWithSnapAccounts', () => ({
  useHdKeyringsWithSnapAccounts: jest.fn(() => [
    {
      accounts: ['0x67B2fAf7959fB61eb9746571041476Bbd0672569'],
      metadata: { id: 'mock-keyring-id' },
    },
  ]),
}));

const mockAccount = {
  ...createMockInternalAccount(
    '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
    'Test Account',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  ),
  options: {
    entropySource: 'mock-entropy-source',
  },
};

const mockInitialState = {
  user: {
    seedphraseBackedUp: false,
  },
};

describe('SecretRecoveryPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with account', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SecretRecoveryPhrase account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByText(
        strings('multichain_accounts.account_details.secret_recovery_phrase'),
      ),
    ).toBeTruthy();
    expect(
      getByTestId(AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK),
    ).toBeTruthy();
  });

  it('navigates to SRP reveal quiz when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <SecretRecoveryPhrase account={mockAccount} />,
      { state: mockInitialState },
    );

    const button = getByTestId(AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK);
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SRPRevealQuiz',
      keyringId: 'mock-entropy-source',
    });
  });

  it('navigates to manual backup flow when backup button is pressed', () => {
    const { getByText } = renderWithProvider(
      <SecretRecoveryPhrase account={mockAccount} />,
      { state: mockInitialState },
    );

    const backupButton = getByText(
      strings('multichain_accounts.export_credentials.backup'),
    );
    fireEvent.press(backupButton);

    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', {
      screen: 'ManualBackupStep1',
      params: { backupFlow: true },
    });
  });
});

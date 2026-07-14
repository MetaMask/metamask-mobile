import { KeyringType } from '@metamask/keyring-api/v2';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';

import Routes from '../../constants/navigation/Routes';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import type { AppNavigationProp } from '../NavigationService/types';
import {
  completeExistingUserQrSyncImport,
  DUPLICATE_MNEMONIC_ERROR_MESSAGES,
  isDuplicateMnemonicError,
  isMnemonicAlreadyOnDevice,
} from './completeExistingUserQrSyncImport';

const mockImportNewSecretRecoveryPhrase = jest.fn();
const mockWithKeyringV2 = jest.fn();
const mockResetState = jest.fn();
const mockNavigate = jest.fn();
const mockShowAlreadySyncedSheet = jest.fn();
const mockShowImportFailedSheet = jest.fn();

jest.mock('../../actions/multiSrp', () => ({
  importNewSecretRecoveryPhrase: (...args: unknown[]) =>
    mockImportNewSecretRecoveryPhrase(...args),
}));

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [] as { type: string; metadata: { id: string } }[],
      },
      withKeyringV2: (...args: unknown[]) => mockWithKeyringV2(...args),
    },
    QrSyncController: {
      resetState: () => mockResetState(),
    },
  },
}));

jest.mock('./showAlreadySyncedSheet', () => ({
  showAlreadySyncedSheet: (...args: unknown[]) =>
    mockShowAlreadySyncedSheet(...args),
}));

jest.mock('./showImportFailedSheet', () => ({
  showImportFailedSheet: (...args: unknown[]) =>
    mockShowImportFailedSheet(...args),
}));

import Engine from '../Engine';

const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';

const setHdKeyringCount = (count: number) => {
  Engine.context.KeyringController.state.keyrings = Array.from(
    { length: count },
    (_, index) => ({
      type: ExtendedKeyringTypes.hd,
      metadata: { id: `hd-${index}` },
    }),
  );
};

describe('completeExistingUserQrSyncImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHdKeyringCount(0);
    mockWithKeyringV2.mockResolvedValue(false);
    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: '0xabc',
      discoveredAccountsCount: 1,
    });
  });

  it('imports the mnemonic, resets QR sync, and navigates to the wallet home', async () => {
    await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

    expect(mockWithKeyringV2).not.toHaveBeenCalled();
    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      TEST_MNEMONIC,
    );
    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('shows already-synced sheet and navigates home when pre-check finds the mnemonic', async () => {
    setHdKeyringCount(1);
    mockWithKeyringV2.mockImplementationOnce(
      async (
        _selector: unknown,
        operation: (args: {
          keyring: { mnemonic: Uint8Array };
        }) => Promise<boolean>,
      ) =>
        operation({
          keyring: { mnemonic: mnemonicPhraseToBytes(TEST_MNEMONIC) },
        }),
    );

    await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

    expect(mockWithKeyringV2).toHaveBeenCalledWith(
      { type: KeyringType.Hd, index: 0 },
      expect.any(Function),
    );
    expect(mockImportNewSecretRecoveryPhrase).not.toHaveBeenCalled();
    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowAlreadySyncedSheet).toHaveBeenCalledWith(mockNavigation);
  });

  it.each([...DUPLICATE_MNEMONIC_ERROR_MESSAGES])(
    'shows already-synced sheet when duplicate error is: %s',
    async (duplicateMessage) => {
      mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
        new Error(duplicateMessage),
      );

      await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

      expect(mockResetState).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
      expect(mockShowAlreadySyncedSheet).toHaveBeenCalledWith(mockNavigation);
    },
  );

  it('treats any already-imported message as a duplicate', () => {
    expect(
      isDuplicateMnemonicError(
        new Error('Wallet already been imported on this device'),
      ),
    ).toBe(true);
  });

  it('detects matching string and byte mnemonics in isMnemonicAlreadyOnDevice', async () => {
    setHdKeyringCount(1);
    mockWithKeyringV2.mockImplementationOnce(
      async (
        _selector: unknown,
        operation: (args: {
          keyring: { mnemonic: string };
        }) => Promise<boolean>,
      ) => operation({ keyring: { mnemonic: TEST_MNEMONIC.toUpperCase() } }),
    );
    await expect(isMnemonicAlreadyOnDevice(TEST_MNEMONIC)).resolves.toBe(true);

    setHdKeyringCount(1);
    mockWithKeyringV2.mockImplementationOnce(
      async (
        _selector: unknown,
        operation: (args: {
          keyring: { mnemonic: Uint8Array };
        }) => Promise<boolean>,
      ) =>
        operation({
          keyring: { mnemonic: mnemonicPhraseToBytes(TEST_MNEMONIC) },
        }),
    );
    await expect(isMnemonicAlreadyOnDevice(TEST_MNEMONIC)).resolves.toBe(true);

    setHdKeyringCount(1);
    mockWithKeyringV2.mockImplementationOnce(
      async (
        _selector: unknown,
        operation: (args: {
          keyring: { mnemonic: Uint8Array };
        }) => Promise<boolean>,
      ) =>
        operation({
          keyring: {
            mnemonic: mnemonicPhraseToBytes(
              'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
            ),
          },
        }),
    );
    await expect(isMnemonicAlreadyOnDevice(TEST_MNEMONIC)).resolves.toBe(false);
  });

  it('shows import-failed sheet and navigates home when import fails for a non-duplicate reason', async () => {
    mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
      new Error('import failed'),
    );

    await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowImportFailedSheet).toHaveBeenCalledWith(mockNavigation);
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
  });

  it('reuses an in-flight import instead of starting a second one', async () => {
    let resolveImport: ((value: unknown) => void) | undefined;
    mockImportNewSecretRecoveryPhrase.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        }),
    );

    const first = completeExistingUserQrSyncImport(
      mockNavigation,
      TEST_MNEMONIC,
    );
    const second = completeExistingUserQrSyncImport(
      mockNavigation,
      TEST_MNEMONIC,
    );

    // Flush pre-check so the shared import starts.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledTimes(1);
    expect(resolveImport).toBeDefined();

    resolveImport?.({
      address: '0xabc',
      discoveredAccountsCount: 1,
    });
    await Promise.all([first, second]);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });
});

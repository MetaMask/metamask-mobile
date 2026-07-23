import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';
import {
  completeExistingUserQrSyncImport,
  DUPLICATE_MNEMONIC_ERROR_MESSAGES,
  isDuplicateMnemonicError,
} from './completeExistingUserQrSyncImport';

const mockImportNewSecretRecoveryPhrase = jest.fn();
const mockResetState = jest.fn();
const mockEnrichPrimaryProvisioningEntry = jest.fn();
const mockImportRemainingSecrets = jest.fn();
const mockProvisionFromMetadata = jest.fn();
const mockNavigate = jest.fn();
const mockShowAlreadySyncedSheet = jest.fn();
const mockShowImportFailedSheet = jest.fn();

jest.mock('../../actions/multiSrp', () => ({
  importNewSecretRecoveryPhrase: (...args: unknown[]) =>
    mockImportNewSecretRecoveryPhrase(...args),
}));

jest.mock('../Engine', () => ({
  context: {
    QrSyncController: {
      resetState: () => mockResetState(),
      enrichPrimaryProvisioningEntry: (...args: unknown[]) =>
        mockEnrichPrimaryProvisioningEntry(...args),
      importRemainingSecrets: (...args: unknown[]) =>
        mockImportRemainingSecrets(...args),
    },
    QrSyncProvisioningService: {
      provisionFromMetadata: (...args: unknown[]) =>
        mockProvisionFromMetadata(...args),
    },
  },
}));

jest.mock(
  '../../components/Views/AddDeviceToWallet/showAlreadySyncedSheet',
  () => ({
    showAlreadySyncedSheet: (...args: unknown[]) =>
      mockShowAlreadySyncedSheet(...args),
  }),
);

jest.mock(
  '../../components/Views/AddDeviceToWallet/showImportFailedSheet',
  () => ({
    showImportFailedSheet: (...args: unknown[]) =>
      mockShowImportFailedSheet(...args),
  }),
);

const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';
const TEST_ENTROPY_SOURCE = 'entropy-source-id';

describe('completeExistingUserQrSyncImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: '0xabc',
      discoveredAccountsCount: 0,
      entropySource: TEST_ENTROPY_SOURCE,
    });
    mockImportRemainingSecrets.mockResolvedValue(undefined);
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('imports mnemonic, enriches metadata, runs Phase C, and navigates home', async () => {
    await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      TEST_MNEMONIC,
      { shouldSelectAccount: true, skipDiscovery: true },
    );
    expect(mockEnrichPrimaryProvisioningEntry).toHaveBeenCalledWith(
      TEST_ENTROPY_SOURCE,
    );
    expect(mockImportRemainingSecrets).toHaveBeenCalledTimes(1);
    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('reports Phase C failure without blocking navigation home', async () => {
    mockProvisionFromMetadata.mockRejectedValueOnce(
      new Error('provision failed'),
    );

    await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockResetState).not.toHaveBeenCalled();
  });

  it.each([...DUPLICATE_MNEMONIC_ERROR_MESSAGES])(
    'shows already-synced sheet when duplicate error is: %s',
    async (duplicateMessage) => {
      mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
        new Error(duplicateMessage),
      );

      await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

      expect(mockResetState).toHaveBeenCalledTimes(1);
      expect(mockEnrichPrimaryProvisioningEntry).not.toHaveBeenCalled();
      expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
      expect(mockShowAlreadySyncedSheet).toHaveBeenCalledWith(mockNavigation);
    },
  );

  it('returns false for non-exact duplicate messages', () => {
    expect(
      isDuplicateMnemonicError(
        new Error('Wallet already been imported on this device'),
      ),
    ).toBe(false);
  });

  it('returns false when error is not an Error instance', () => {
    expect(
      isDuplicateMnemonicError('This mnemonic has already been imported.'),
    ).toBe(false);
  });

  it('shows import-failed sheet and navigates home when import fails for a non-duplicate reason', async () => {
    mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
      new Error('import failed'),
    );

    await completeExistingUserQrSyncImport(mockNavigation, TEST_MNEMONIC);

    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
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

    await Promise.resolve();

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledTimes(1);
    expect(resolveImport).toBeDefined();

    resolveImport?.({
      address: '0xabc',
      discoveredAccountsCount: 0,
      entropySource: TEST_ENTROPY_SOURCE,
    });
    await Promise.all([first, second]);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
  });
});

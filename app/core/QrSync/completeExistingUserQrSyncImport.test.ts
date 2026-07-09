import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';
import { completeExistingUserQrSyncImport } from './completeExistingUserQrSyncImport';

const mockImportNewSecretRecoveryPhrase = jest.fn();
const mockResetState = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../actions/multiSrp', () => ({
  importNewSecretRecoveryPhrase: (...args: unknown[]) =>
    mockImportNewSecretRecoveryPhrase(...args),
}));

jest.mock('../Engine', () => ({
  context: {
    QrSyncController: {
      resetState: () => mockResetState(),
    },
  },
}));

const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

describe('completeExistingUserQrSyncImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: '0xabc',
      discoveredAccountsCount: 1,
    });
  });

  it('imports the mnemonic, resets QR sync, and navigates to the wallet home', async () => {
    const mnemonic =
      'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';

    await completeExistingUserQrSyncImport(mockNavigation, mnemonic);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(mnemonic);
    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('resets QR sync state when import fails', async () => {
    mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
      new Error('import failed'),
    );

    await expect(
      completeExistingUserQrSyncImport(mockNavigation, 'test mnemonic'),
    ).rejects.toThrow('import failed');

    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

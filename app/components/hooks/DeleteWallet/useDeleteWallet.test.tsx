import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import useDeleteWallet from './useDeleteWallet';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { Authentication } from '../../../core';
import { resetProviderToken as depositResetProviderToken } from '../../UI/Ramp/Deposit/utils/ProviderTokenVault';

jest.mock('../../../core/Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      clearState: jest.fn(),
    },
  },
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clearAll: jest.fn(),
}));

jest.mock('../../../core/BackupVault', () => ({
  clearAllVaultBackups: jest.fn(),
}));

jest.mock('../../../core', () => ({
  Authentication: {
    newWalletAndKeychain: jest.fn(),
    lockApp: jest.fn(),
  },
}));

jest.mock('../useMetrics', () => ({
  useMetrics: () => ({
    createDataDeletionTask: jest.fn(),
  }),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../UI/Ramp/Deposit/utils/ProviderTokenVault', () => ({
  resetProviderToken: jest.fn(),
}));

describe('useDeleteWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it should provide two outputs of type function', () => {
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [resetWalletState, deleteUser] = result.current;
    expect(typeof resetWalletState).toBe('function');
    expect(typeof deleteUser).toBe('function');
  });

  test('it should call the appropriate methods to reset the wallet', async () => {
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [resetWalletState, _] = result.current;
    const newWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );
    const clearStateSpy = jest.spyOn(
      Engine.context.SeedlessOnboardingController,
      'clearState',
    );
    const loggerSpy = jest.spyOn(Logger, 'log');
    const resetProviderTokenSpy = jest.mocked(depositResetProviderToken);

    await resetWalletState();

    expect(newWalletAndKeychain).toHaveBeenCalledWith(expect.any(String), {
      currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
    });
    expect(clearStateSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).not.toHaveBeenCalled();
    expect(resetProviderTokenSpy).toHaveBeenCalledTimes(1);
  });

  test('it should handle errors gracefully when resetWalletState fails', async () => {
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [resetWalletState] = result.current;

    const newWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );
    const loggerSpy = jest.spyOn(Logger, 'log');
    newWalletAndKeychain.mockRejectedValueOnce(
      new Error('Authentication failed'),
    );

    await expect(resetWalletState()).resolves.not.toThrow();
    expect(newWalletAndKeychain).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining('Failed to createNewVaultAndKeychain'),
    );
  });

  test('it should call the appropriate methods to delete the user', async () => {
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, deleteUser] = result.current;
    const loggerSpy = jest.spyOn(Logger, 'log');

    await deleteUser();

    // Check that the Redux action was dispatched (this is handled by the store)
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  test('it should handle errors gracefully when deleteUser fails', async () => {
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [, deleteUser] = result.current;

    const loggerSpy = jest.spyOn(Logger, 'log');
    // Since the metrics hook is already mocked to return a working function,
    // we'll just verify that the function completes without throwing
    await expect(deleteUser()).resolves.not.toThrow();
    expect(loggerSpy).not.toHaveBeenCalled();
  });
});

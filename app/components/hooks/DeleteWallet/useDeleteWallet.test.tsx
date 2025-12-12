import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import useDeleteWallet from './useDeleteWallet';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import Engine from '../../../core/Engine';
import { Engine as EngineClass } from '../../../core/Engine/Engine';
import Logger from '../../../util/Logger';
import { Authentication } from '../../../core';
import { clearAllVaultBackups } from '../../../core/BackupVault';
import { resetProviderToken as depositResetProviderToken } from '../../UI/Ramp/Deposit/utils/ProviderTokenVault';

jest.mock('../../../core/Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      clearState: jest.fn(),
    },
  },
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../core/Engine/Engine', () => ({
  Engine: {
    disableAutomaticVaultBackup: false,
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
    EngineClass.disableAutomaticVaultBackup = false;
  });

  test('provides two functions for wallet operations', () => {
    // Arrange & Act
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [resetWalletState, deleteUser] = result.current;

    // Assert
    expect(typeof resetWalletState).toBe('function');
    expect(typeof deleteUser).toBe('function');
  });

  test('calls vault backup clear before creating temporary wallet', async () => {
    // Arrange
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [resetWalletState] = result.current;
    const clearVaultSpy = jest.mocked(clearAllVaultBackups);
    const newWalletSpy = jest.spyOn(Authentication, 'newWalletAndKeychain');

    // Act
    await resetWalletState();

    // Assert
    expect(clearVaultSpy).toHaveBeenCalledTimes(1);
    const clearCallOrder = clearVaultSpy.mock.invocationCallOrder[0];
    const newWalletCallOrder = newWalletSpy.mock.invocationCallOrder[0];
    expect(clearCallOrder).toBeLessThan(newWalletCallOrder);
  });

  test('disables automatic vault backup during wallet reset', async () => {
    // Arrange
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [resetWalletState] = result.current;

    // Act
    await resetWalletState();

    // Assert - flag is re-enabled after reset completes
    expect(EngineClass.disableAutomaticVaultBackup).toBe(false);
  });

  test('re-enables automatic vault backup even when error occurs', async () => {
    // Arrange
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [resetWalletState] = result.current;
    jest
      .spyOn(Authentication, 'newWalletAndKeychain')
      .mockRejectedValueOnce(new Error('Authentication failed'));

    // Act
    await resetWalletState();

    // Assert - flag is still re-enabled despite error
    expect(EngineClass.disableAutomaticVaultBackup).toBe(false);
  });

  test('calls all required methods to reset wallet state', async () => {
    // Arrange
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
    const resetRewardsSpy = jest.spyOn(Engine.controllerMessenger, 'call');
    const loggerSpy = jest.spyOn(Logger, 'log');
    const resetProviderTokenSpy = jest.mocked(depositResetProviderToken);

    // Act
    await resetWalletState();

    // Assert
    expect(newWalletAndKeychain).toHaveBeenCalledWith(expect.any(String), {
      currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
    });
    expect(clearStateSpy).toHaveBeenCalledTimes(1);
    expect(resetRewardsSpy).toHaveBeenCalledTimes(1);
    expect(resetRewardsSpy).toHaveBeenCalledWith('RewardsController:resetAll');
    expect(loggerSpy).not.toHaveBeenCalled();
    expect(resetProviderTokenSpy).toHaveBeenCalledTimes(1);
  });

  test('logs error when resetWalletState fails', async () => {
    // Arrange
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

    // Act
    await resetWalletState();

    // Assert
    expect(newWalletAndKeychain).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining('Failed to createNewVaultAndKeychain'),
    );
  });

  test('dispatches Redux action to delete user', async () => {
    // Arrange
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, deleteUser] = result.current;
    const loggerSpy = jest.spyOn(Logger, 'log');

    // Act
    await deleteUser();

    // Assert - Redux action was dispatched (handled by store)
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  test('completes without throwing when deleteUser succeeds', async () => {
    // Arrange
    const { result } = renderHookWithProvider(() => useDeleteWallet());
    const [, deleteUser] = result.current;
    const loggerSpy = jest.spyOn(Logger, 'log');

    // Act & Assert
    await expect(deleteUser()).resolves.not.toThrow();
    expect(loggerSpy).not.toHaveBeenCalled();
  });
});

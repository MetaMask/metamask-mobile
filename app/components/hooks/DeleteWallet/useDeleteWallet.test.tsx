import { renderHook } from '@testing-library/react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import useDeleteWallet from './useDeleteWallet';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';

jest.mock('../../../core/Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      clearState: jest.fn(),
    },
  },
}));

jest.mock('../../../store/storage-wrapper', () => ({
  removeItem: jest.fn(),
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

describe('useDeleteWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it should provide two outputs of type function', () => {
    const { result } = renderHook(() => useDeleteWallet());
    const [resetWalletState, deleteUser] = result.current;
    expect(typeof resetWalletState).toBe('function');
    expect(typeof deleteUser).toBe('function');
  });

  test('it should call the appropriate methods to reset the wallet', async () => {
    const { result } = renderHook(() => useDeleteWallet());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [resetWalletState, _] = result.current;
    const newWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );
    const clearStateSpy = jest.spyOn(Engine.context.SeedlessOnboardingController, 'clearState');
    const loggerSpy = jest.spyOn(Logger, 'log');

    await resetWalletState();

    expect(newWalletAndKeychain).toHaveBeenCalledWith(expect.any(String), {
      currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
    });
    expect(clearStateSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  test('it should handle errors gracefully when resetWalletState fails', async () => {
    const { result } = renderHook(() => useDeleteWallet());
    const [resetWalletState] = result.current;

    const newWalletAndKeychain = jest.spyOn(Authentication, 'newWalletAndKeychain');
    const loggerSpy = jest.spyOn(Logger, 'log');
    newWalletAndKeychain.mockRejectedValueOnce(new Error('Authentication failed'));

    await expect(resetWalletState()).resolves.not.toThrow();
    expect(newWalletAndKeychain).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining('Failed to createNewVaultAndKeychain')
    );
  });

  test('it should call the appropriate methods to delete the user', async () => {
    const { result } = renderHook(() => useDeleteWallet());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, deleteUser] = result.current;
    const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
    const loggerSpy = jest.spyOn(Logger, 'log');

    await deleteUser();

    expect(removeItemSpy).toHaveBeenCalled();
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  test('it should handle errors gracefully when deleteUser fails', async () => {
    const { result } = renderHook(() => useDeleteWallet());
    const [, deleteUser] = result.current;

    const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
    const loggerSpy = jest.spyOn(Logger, 'log');
    removeItemSpy.mockRejectedValueOnce(new Error('Storage error'));

    await expect(deleteUser()).resolves.not.toThrow();
    expect(removeItemSpy).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalled();
  });
});

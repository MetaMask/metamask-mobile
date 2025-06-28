import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useDeleteWallet from './useDeleteWallet';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { clearAllVaultBackups } from '../../../core/BackupVault';
import ReduxService from '../../../core/redux';
import { Authentication } from '../../../core';
import { UserActionType } from '../../../actions/user/types';

// Mock the metrics hook
jest.mock('../useMetrics', () => ({
  useMetrics: () => ({
    createDataDeletionTask: jest.fn(),
  }),
}));

jest.mock('../../../core/BackupVault', () => ({
  clearAllVaultBackups: jest.fn(),
}));

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
}));

// Mock the entire core module to ensure Authentication is mocked
jest.mock('../../../core', () => ({
  Authentication: {
    newWalletAndKeychain: jest.fn(),
    lockApp: jest.fn(),
  },
}));

// Create a mock store for testing
const createMockStore = () =>
  configureStore({
    reducer: {
      user: (state, action) => {
        if (action.type === UserActionType.SET_EXISTING_USER) {
          return { ...state, existingUser: action.payload.existingUser };
        }
        return state || { existingUser: true };
      },
    },
  });

describe('useDeleteWallet', () => {
  let store: ReturnType<typeof createMockStore>;
  const mockDateNow = 1234567890;

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    
    // Set the store in ReduxService
    ReduxService.store = store;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderHookWithProvider = () =>
    renderHook(() => useDeleteWallet(), {
      wrapper: ({ children }) => (
        <Provider store={store}>{children}</Provider>
      ),
    });

  test('it should provide two outputs of type function', () => {
    const { result } = renderHookWithProvider();
    const [resetWalletState, deleteUser] = result.current;
    expect(typeof resetWalletState).toBe('function');
    expect(typeof deleteUser).toBe('function');
  });

  test('it should call the appropriate methods to reset the wallet', async () => {
    const { result } = renderHookWithProvider();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [resetWalletState, _] = result.current;
    
    await resetWalletState();
    
    expect(Authentication.newWalletAndKeychain).toHaveBeenCalledWith(mockDateNow.toString(), {
      currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
    });
    expect(clearAllVaultBackups).toHaveBeenCalled();
    expect(Authentication.lockApp).toHaveBeenCalled();
  });

  test('it should call the appropriate methods to delete the user', async () => {
    const { result } = renderHookWithProvider();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, deleteUser] = result.current;
    
    await deleteUser();
    
    // Check that the Redux action was dispatched
    const state = store.getState();
    expect(state.user.existingUser).toBe(false);
  });
});

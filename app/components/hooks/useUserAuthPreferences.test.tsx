import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUserAuthPreferences } from './useUserAuthPreferences';
import { Authentication } from '../../core';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import StorageWrapper from '../../store/storage-wrapper';
import { updateAuthTypeStorageFlags } from '../../util/authentication';
import { BIOMETRY_TYPE } from 'react-native-keychain';

// Mock dependencies
jest.mock('../../core');
jest.mock('../../store/storage-wrapper');
jest.mock('../../util/authentication');
jest.mock('../../actions/security', () => ({
  setAllowLoginWithRememberMe: jest.fn(),
}));

describe('useUserAuthPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('handles PASSCODE authentication type', async () => {
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      availableBiometryType: null,
    });

    const { result } = renderHook(() =>
      useUserAuthPreferences({ locked: false }),
    );

    await waitFor(() => {
      expect(result.current.hasBiometricCredentials).toBe(true);
      expect(result.current.biometryChoice).toBe(true);
    });
  });

  it('handles REMEMBER_ME authentication type', async () => {
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.REMEMBER_ME,
      availableBiometryType: null,
    });

    const { result } = renderHook(() => useUserAuthPreferences());

    await waitFor(() => {
      expect(result.current.rememberMe).toBe(true);
      expect(result.current.hasBiometricCredentials).toBe(false);
    });
  });

  it('handles BIOMETRIC authentication type', async () => {
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      availableBiometryType: BIOMETRY_TYPE.FACE_ID,
    });

    const { result } = renderHook(() => useUserAuthPreferences());

    await waitFor(() => {
      expect(result.current.biometryType).toBe(BIOMETRY_TYPE.FACE_ID);
      expect(result.current.hasBiometricCredentials).toBe(true);
      expect(result.current.biometryChoice).toBe(true);
    });
  });

  it('respects previously disabled biometry choice', async () => {
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      availableBiometryType: BIOMETRY_TYPE.TOUCH_ID,
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('true');

    const { result } = renderHook(() => useUserAuthPreferences());

    await waitFor(() => {
      expect(result.current.biometryChoice).toBe(false);
    });
  });

  it('updates biometry choice and storage', async () => {
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      availableBiometryType: BIOMETRY_TYPE.FACE_ID,
    });

    const { result } = renderHook(() => useUserAuthPreferences());

    await waitFor(() => {
      expect(result.current.biometryChoice).toBe(true);
    });

    await act(async () => {
      await result.current.updateBiometryChoice(false);
    });

    expect(updateAuthTypeStorageFlags).toHaveBeenCalledWith(false);
    expect(result.current.biometryChoice).toBe(false);
  });

  it('refreshes auth preferences when refreshTrigger changes', async () => {
    (Authentication.getType as jest.Mock).mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      availableBiometryType: null,
    });

    const { rerender } = renderHook(
      ({ refreshTrigger }) => useUserAuthPreferences({ refreshTrigger }),
      { initialProps: { refreshTrigger: false } },
    );

    await waitFor(() => {
      expect(Authentication.getType).toHaveBeenCalledTimes(1);
    });

    rerender({ refreshTrigger: true });

    await waitFor(() => {
      expect(Authentication.getType).toHaveBeenCalledTimes(2);
    });
  });
});

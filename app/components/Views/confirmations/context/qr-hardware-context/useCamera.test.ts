/* eslint-disable react-native/split-platform-components */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { PermissionsAndroid } from 'react-native';

import Device from '../../../../../util/device';
import { useCamera } from './useCamera';

jest.mock('../../../../../util/device', () => ({
  isIos: () => false,
  isAndroid: () => true,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

describe('useCamera', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Device, 'isIos').mockReturnValue(false);
    jest.spyOn(Device, 'isAndroid').mockReturnValue(true);
  });

  it('returns correct initial values if parameter isSigningQRObject is false', () => {
    const { result } = renderHook(() => useCamera(false));
    expect(result.current).toMatchObject({
      cameraError: undefined,
      hasCameraPermission: false,
    });
  });

  it('returns correct initial values if parameter isSigningQRObject is true', () => {
    const { result } = renderHook(() => useCamera(true));
    expect(result.current).toMatchObject({
      cameraError: undefined,
      hasCameraPermission: false,
    });
  });

  it('returns correct initial values if device is IOS', () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(true);
    const { result } = renderHook(() => useCamera(true));
    expect(result.current).toMatchObject({
      cameraError: undefined,
      hasCameraPermission: true,
    });
  });

  it('sets hasCameraPermission to true when check() returns true on Android', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);

    const { result } = renderHook(() => useCamera(true));

    await waitFor(() => {
      expect(result.current.hasCameraPermission).toBe(true);
    });

    expect(PermissionsAndroid.check).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(result.current.cameraError).toBeUndefined();
  });

  it('requests permission when check() returns false and grants access', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);

    const { result } = renderHook(() => useCamera(true));

    await waitFor(() => {
      expect(result.current.hasCameraPermission).toBe(true);
    });

    expect(PermissionsAndroid.check).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(result.current.cameraError).toBeUndefined();
  });

  it('sets camera error when permission request is denied', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    const { result } = renderHook(() => useCamera(true));

    await waitFor(() => {
      expect(result.current.cameraError).toBeDefined();
    });

    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(result.current.hasCameraPermission).toBe(false);
  });

  it('sets camera error when permission request returns never_ask_again', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

    const { result } = renderHook(() => useCamera(true));

    await waitFor(() => {
      expect(result.current.cameraError).toBeDefined();
    });

    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(result.current.hasCameraPermission).toBe(false);
  });

  it('does not check permission when isSigningQRObject is false', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);

    renderHook(() => useCamera(false));

    await act(async () => {
      // Allow any pending effects to flush
    });

    expect(PermissionsAndroid.check).not.toHaveBeenCalled();
  });

  it('does not request permission on iOS', async () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(true);
    jest.spyOn(Device, 'isAndroid').mockReturnValue(false);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    renderHook(() => useCamera(true));

    await act(async () => {
      // Allow any pending effects to flush
    });

    expect(PermissionsAndroid.check).not.toHaveBeenCalled();
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  });
});

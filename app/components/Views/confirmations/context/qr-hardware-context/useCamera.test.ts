import { renderHook } from '@testing-library/react-native';

import Device from '../../../../../util/device';
import { useCamera } from './useCamera';

jest.mock('../../../../../util/device', () => ({
  isIos: () => false,
  isAndroid: () => true,
}));

describe('useCamera', () => {
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
});

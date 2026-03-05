import { renderHook } from '@testing-library/react-native';

import { useCamera } from './useCamera';

describe('useCamera', () => {
  it('always returns hasCameraPermission as true', () => {
    const { result } = renderHook(() => useCamera(false));
    expect(result.current).toMatchObject({
      cameraError: undefined,
      hasCameraPermission: true,
    });
  });

  it('always returns hasCameraPermission as true when signing QR object', () => {
    const { result } = renderHook(() => useCamera(true));
    expect(result.current).toMatchObject({
      cameraError: undefined,
      hasCameraPermission: true,
    });
  });
});

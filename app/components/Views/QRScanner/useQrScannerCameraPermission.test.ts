import { act, renderHook } from '@testing-library/react-hooks';
import { AppState } from 'react-native';
import { useQrScannerCameraPermission } from './useQrScannerCameraPermission';

const mockRequestPermission = jest.fn();
const mockUseCameraPermission = jest.fn();

jest.mock('react-native-vision-camera', () => ({
  useCameraPermission: () => mockUseCameraPermission(),
}));

const flushAsyncEffects = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useQrScannerCameraPermission', () => {
  let appStateListener: ((state: string) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = undefined;

    mockUseCameraPermission.mockReturnValue({
      hasPermission: false,
      requestPermission: mockRequestPermission,
    });

    mockRequestPermission.mockResolvedValue('granted');

    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, cb) => {
        appStateListener = cb as (state: string) => void;
        return { remove: jest.fn() };
      });

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'active',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks permission check complete when camera permission is already granted', () => {
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: mockRequestPermission,
    });

    const { result } = renderHook(() =>
      useQrScannerCameraPermission({ isActive: true }),
    );

    expect(result.current.hasPermission).toBe(true);
    expect(result.current.permissionCheckCompleted).toBe(true);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('requests permission when scanner is active and permission is missing', async () => {
    const { result } = renderHook(() =>
      useQrScannerCameraPermission({ isActive: true }),
    );

    await flushAsyncEffects();

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result.current.permissionCheckCompleted).toBe(true);
  });

  it('skips permission request when scanner is inactive', () => {
    renderHook(() => useQrScannerCameraPermission({ isActive: false }));

    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('marks permission check complete when requestPermission throws', async () => {
    mockRequestPermission.mockRejectedValue(new Error('permission denied'));

    const { result } = renderHook(() =>
      useQrScannerCameraPermission({ isActive: true }),
    );

    await flushAsyncEffects();

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result.current.permissionCheckCompleted).toBe(true);
  });

  it('re-requests permission when app returns to foreground without permission', async () => {
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'background',
    });

    renderHook(() => useQrScannerCameraPermission({ isActive: true }));

    await flushAsyncEffects();
    mockRequestPermission.mockClear();

    await act(async () => {
      appStateListener?.('active');
      await Promise.resolve();
    });

    expect(mockRequestPermission).toHaveBeenCalled();
  });
});

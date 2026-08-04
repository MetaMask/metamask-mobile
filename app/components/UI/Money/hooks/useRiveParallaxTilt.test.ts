import { renderHook, act } from '@testing-library/react-native';
import type { RiveFile } from '@rive-app/react-native';
import { useRiveParallaxTilt } from './useRiveParallaxTilt';
import { useDeviceOrientation } from './useDeviceOrientation';

const mockSetNumber = jest.fn();
const mockNumberProperty = jest.fn((path: string) => ({
  set: (value: number) => mockSetNumber(path, value),
}));
let mockInstanceReady = true;
const mockUseViewModelInstance = jest.fn(() => ({
  instance: mockInstanceReady ? { numberProperty: mockNumberProperty } : null,
  isLoading: !mockInstanceReady,
  error: null,
}));

jest.mock('@rive-app/react-native', () => ({
  useViewModelInstance: (...args: unknown[]) =>
    mockUseViewModelInstance(...(args as [])),
}));

jest.mock('./useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

const mockUseDeviceOrientation = useDeviceOrientation as jest.Mock;

const mockRiveFile = {} as RiveFile;

const latestApplyTilt = (): ((x: number, y: number) => void) =>
  mockUseDeviceOrientation.mock.calls[
    mockUseDeviceOrientation.mock.calls.length - 1
  ][0];

describe('useRiveParallaxTilt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstanceReady = true;
    mockNumberProperty.mockImplementation((path: string) => ({
      set: (value: number) => mockSetNumber(path, value),
    }));
  });

  it('binds the view model of the given artboard asynchronously', () => {
    renderHook(() =>
      useRiveParallaxTilt(mockRiveFile, {
        artboardName: 'Artboard A',
        enabled: true,
      }),
    );

    expect(mockUseViewModelInstance).toHaveBeenCalledWith(mockRiveFile, {
      artboardName: 'Artboard A',
      async: true,
    });
  });

  it('returns the bound view-model instance', () => {
    const { result } = renderHook(() =>
      useRiveParallaxTilt(mockRiveFile, {
        artboardName: 'Artboard A',
        enabled: true,
      }),
    );

    expect(result.current).toEqual({ numberProperty: mockNumberProperty });
  });

  it('passes the enabled flag through to the device orientation hook', () => {
    renderHook(() =>
      useRiveParallaxTilt(mockRiveFile, {
        artboardName: 'Artboard A',
        enabled: false,
      }),
    );

    expect(mockUseDeviceOrientation).toHaveBeenCalledWith(
      expect.any(Function),
      { enabled: false },
    );
  });

  it('drives the bound Rive number properties from mapped tilt values', () => {
    renderHook(() =>
      useRiveParallaxTilt(mockRiveFile, {
        artboardName: 'Artboard A',
        enabled: true,
      }),
    );

    act(() => latestApplyTilt()(0.5, 0.5));

    expect(mockSetNumber).toHaveBeenCalledWith('xValue', 75);
    expect(mockSetNumber).toHaveBeenCalledWith('yValue', 25);
  });

  it('does not dispatch tilt values before the view-model instance is ready', () => {
    mockInstanceReady = false;
    renderHook(() =>
      useRiveParallaxTilt(mockRiveFile, {
        artboardName: 'Artboard A',
        enabled: true,
      }),
    );

    act(() => latestApplyTilt()(0.5, -0.5));

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('does not dispatch tilt values when the artboard has no parallax properties', () => {
    mockNumberProperty.mockReturnValue(
      undefined as unknown as ReturnType<typeof mockNumberProperty>,
    );
    renderHook(() =>
      useRiveParallaxTilt(mockRiveFile, {
        artboardName: 'Artboard A',
        enabled: true,
      }),
    );

    act(() => latestApplyTilt()(0.5, -0.5));

    expect(mockSetNumber).not.toHaveBeenCalled();
  });
});

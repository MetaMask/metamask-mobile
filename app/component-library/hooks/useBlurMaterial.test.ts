import { AccessibilityInfo, Platform } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

import { AppThemeKey } from '../../util/theme/models';
import { useBlurMaterial } from './useBlurMaterial';

const mockTheme = { appearance: AppThemeKey.dark };
jest.mock('../../util/theme', () => ({
  useTheme: () => ({ themeAppearance: mockTheme.appearance }),
}));

const mockRequireOptionalNativeModule = jest.fn();
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: (name: string) =>
    mockRequireOptionalNativeModule(name),
}));

describe('useBlurMaterial', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    mockTheme.appearance = AppThemeKey.dark;
    mockRequireOptionalNativeModule.mockReturnValue({});
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockResolvedValue(false);
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('allows a system blur on iOS once the transparency setting is known', async () => {
    const { result } = renderHook(() => useBlurMaterial());

    await waitFor(() => expect(result.current.isBlurAvailable).toBe(true));
  });

  it('does not draw a blur before the transparency setting has been read', () => {
    // A promise that never settles stands in for the read still being in flight.
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useBlurMaterial());

    expect(result.current.isBlurAvailable).toBe(false);
  });

  it('stays opaque when the binary predates the blur module', () => {
    mockRequireOptionalNativeModule.mockReturnValue(null);

    const { result } = renderHook(() => useBlurMaterial());

    expect(result.current.isBlurAvailable).toBe(false);
    expect(mockRequireOptionalNativeModule).toHaveBeenCalledWith('ExpoBlur');
  });

  it('stays opaque on Android, which has no equivalent chrome material', () => {
    Platform.OS = 'android';

    const { result } = renderHook(() => useBlurMaterial());

    expect(result.current.isBlurAvailable).toBe(false);
  });

  it('does not read the accessibility setting on an unsupported platform', () => {
    Platform.OS = 'android';

    renderHook(() => useBlurMaterial());

    expect(
      AccessibilityInfo.isReduceTransparencyEnabled,
    ).not.toHaveBeenCalled();
  });

  it('stays opaque when the user has turned Reduce Transparency on', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockResolvedValue(true);

    const { result } = renderHook(() => useBlurMaterial());

    // Wait for the read to land, then confirm it never enabled the blur.
    await waitFor(() =>
      expect(AccessibilityInfo.isReduceTransparencyEnabled).toHaveBeenCalled(),
    );
    expect(result.current.isBlurAvailable).toBe(false);
  });

  it('takes its appearance from the app theme, not the system one', () => {
    mockTheme.appearance = AppThemeKey.light;

    const { result } = renderHook(() => useBlurMaterial());

    expect(result.current.colorScheme).toBe('light');
  });
});

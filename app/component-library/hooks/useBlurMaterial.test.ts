import { createElement, type ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

import { ThemeContext } from '../../util/theme';
import { AppThemeKey } from '../../util/theme/models';
import { useBlurMaterial } from './useBlurMaterial';

// `useTheme` reads `ThemeContext` and falls back to a light theme, so the
// appearance is driven through the real provider rather than a module mock.
const renderBlurMaterial = (appearance: AppThemeKey = AppThemeKey.dark) =>
  renderHook(() => useBlurMaterial(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        ThemeContext.Provider,
        { value: { themeAppearance: appearance } },
        children,
      ),
  });

let mockRemembered: boolean | undefined;
const mockRemember = jest.fn();
jest.mock('./reduceTransparencyMemory', () => ({
  getRememberedReduceTransparency: () => mockRemembered,
  rememberReduceTransparency: (enabled: boolean) => mockRemember(enabled),
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
    mockRemembered = undefined;
    mockRequireOptionalNativeModule.mockReturnValue({});
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockResolvedValue(false);
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('allows a system blur on iOS once the transparency setting is known', async () => {
    const { result } = renderBlurMaterial();

    await waitFor(() => expect(result.current.isBlurAvailable).toBe(true));
  });

  it('does not draw a blur before the transparency setting has been read', () => {
    // A promise that never settles stands in for the read still being in flight.
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockReturnValue(new Promise(() => undefined));

    const { result } = renderBlurMaterial();

    expect(result.current.isBlurAvailable).toBe(false);
  });

  it('draws the blur on the first frame when the setting is already known', () => {
    mockRemembered = false;

    const { result } = renderBlurMaterial();

    expect(result.current.isBlurAvailable).toBe(true);
  });

  it('starts opaque when the setting was remembered as on', () => {
    mockRemembered = true;

    const { result } = renderBlurMaterial();

    expect(result.current.isBlurAvailable).toBe(false);
  });

  it('remembers the setting once it has been read', async () => {
    renderBlurMaterial();

    await waitFor(() => expect(mockRemember).toHaveBeenCalledWith(false));
  });

  it('stays opaque when the binary predates the blur module', () => {
    mockRequireOptionalNativeModule.mockReturnValue(null);

    const { result } = renderBlurMaterial();

    expect(result.current.isBlurAvailable).toBe(false);
    expect(mockRequireOptionalNativeModule).toHaveBeenCalledWith('ExpoBlur');
  });

  it('stays opaque on Android, which has no equivalent chrome material', () => {
    Platform.OS = 'android';

    const { result } = renderBlurMaterial();

    expect(result.current.isBlurAvailable).toBe(false);
  });

  it('does not read the accessibility setting on an unsupported platform', () => {
    Platform.OS = 'android';

    renderBlurMaterial();

    expect(
      AccessibilityInfo.isReduceTransparencyEnabled,
    ).not.toHaveBeenCalled();
  });

  it('stays opaque when the user has turned Reduce Transparency on', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockResolvedValue(true);

    const { result } = renderBlurMaterial();

    // Wait for the read to land, then confirm it never enabled the blur.
    await waitFor(() =>
      expect(AccessibilityInfo.isReduceTransparencyEnabled).toHaveBeenCalled(),
    );
    expect(result.current.isBlurAvailable).toBe(false);
  });

  it('takes its appearance from the app theme, not the system one', () => {
    const { result } = renderBlurMaterial(AppThemeKey.light);

    expect(result.current.colorScheme).toBe('light');
    expect(result.current.tint).toBe('systemChromeMaterialLight');
  });

  it('offers the dark chrome material for the dark theme', () => {
    const { result } = renderBlurMaterial();

    expect(result.current.tint).toBe('systemChromeMaterialDark');
  });
});

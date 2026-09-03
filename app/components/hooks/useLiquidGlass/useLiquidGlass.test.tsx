import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { ThemeContext } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { useLiquidGlass } from './useLiquidGlass';

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: jest.fn(),
}));

const mockIsLiquidGlassAvailable = jest.mocked(isLiquidGlassAvailable);

const mockAddEventListener = jest.spyOn(AccessibilityInfo, 'addEventListener');
const mockIsReduceTransparencyEnabled = jest.spyOn(
  AccessibilityInfo,
  'isReduceTransparencyEnabled',
);

const renderWithTheme = (appTheme: AppThemeKey = AppThemeKey.light) =>
  renderHook(() => useLiquidGlass(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeContext.Provider value={{ themeAppearance: appTheme }}>
        {children}
      </ThemeContext.Provider>
    ),
  });

/** Emits on the listener the hook registered, so tests can toggle the setting. */
const emitReduceTransparency = (enabled: boolean) => {
  // `addEventListener` is overloaded per event, so the recorded call is typed
  // to the first overload; widen before comparing.
  const handler = mockAddEventListener.mock.calls.find(
    ([event]) => String(event) === 'reduceTransparencyChanged',
  )?.[1] as ((value: boolean) => void) | undefined;
  act(() => handler?.(enabled));
};

describe('useLiquidGlass', () => {
  const mockRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLiquidGlassAvailable.mockReturnValue(true);
    mockIsReduceTransparencyEnabled.mockResolvedValue(false);
    mockAddEventListener.mockReturnValue({
      remove: mockRemove,
    } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);
  });

  it('enables glass when the platform supports it and transparency is allowed', async () => {
    const { result } = renderWithTheme();

    await waitFor(() => expect(result.current.isGlassEnabled).toBe(true));
  });

  it('disables glass on platforms without it, without reading accessibility state', () => {
    mockIsLiquidGlassAvailable.mockReturnValue(false);

    const { result } = renderWithTheme();

    expect(result.current.isGlassEnabled).toBe(false);
    expect(mockIsReduceTransparencyEnabled).not.toHaveBeenCalled();
  });

  // Availability stays true when the setting is on, so it has to be read
  // separately or the user's preference is silently ignored.
  it('disables glass when Reduce Transparency is already on at mount', async () => {
    mockIsReduceTransparencyEnabled.mockResolvedValue(true);

    const { result } = renderWithTheme();

    await waitFor(() => expect(result.current.isGlassEnabled).toBe(false));
  });

  it('follows Reduce Transparency being toggled while mounted', async () => {
    const { result } = renderWithTheme();
    await waitFor(() => expect(result.current.isGlassEnabled).toBe(true));

    emitReduceTransparency(true);
    expect(result.current.isGlassEnabled).toBe(false);

    emitReduceTransparency(false);
    expect(result.current.isGlassEnabled).toBe(true);
  });

  it('stops listening on unmount', async () => {
    const { result, unmount } = renderWithTheme();
    await waitFor(() => expect(result.current.isGlassEnabled).toBe(true));

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  // The app has its own appearance setting, so `auto` would tint a dark-themed
  // app for a light-mode device.
  it.each([
    [AppThemeKey.dark, 'dark'],
    [AppThemeKey.light, 'light'],
  ])('maps the %s app theme to the %s glass scheme', (appTheme, expected) => {
    const { result } = renderWithTheme(appTheme);

    expect(result.current.glassColorScheme).toBe(expected);
  });
});

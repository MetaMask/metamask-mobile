import { renderHook } from '@testing-library/react-native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { useIsNativeHeader, useNativeHeader } from './useNativeHeader';

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: jest.fn(() => true),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({ colors: { icon: { default: 'icon-default' } } }),
}));

const mockSetOptions = jest.fn();
const leftItems = (): NativeStackHeaderItem[] => [];
const rightItems = (): NativeStackHeaderItem[] => [];

describe('useIsNativeHeader', () => {
  it('is on where the OS can draw Liquid Glass', () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);

    const { result } = renderHook(() => useIsNativeHeader());

    expect(result.current).toBe(true);
  });

  it('is off where the OS cannot draw Liquid Glass', () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);

    const { result } = renderHook(() => useIsNativeHeader());

    expect(result.current).toBe(false);
  });
});

describe('useNativeHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);
    jest.mocked(useNavigation).mockReturnValue({ setOptions: mockSetOptions });
  });

  it('shows the transparent native bar with the given items', () => {
    const { result } = renderHook(() =>
      useNativeHeader({ leftItems, rightItems }),
    );

    expect(result.current).toBe(true);
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerShown: true,
        headerTransparent: true,
        title: '',
        unstable_headerLeftItems: leftItems,
        unstable_headerRightItems: rightItems,
      }),
    );
  });

  it('leaves the navigator options alone when the screen gate is off', () => {
    const { result } = renderHook(() =>
      useNativeHeader({ leftItems, rightItems, isEnabled: false }),
    );

    expect(result.current).toBe(false);
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('hides the native bar again when the screen gate turns off', () => {
    const { rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) =>
        useNativeHeader({ leftItems, rightItems, isEnabled }),
      { initialProps: { isEnabled: true } },
    );
    mockSetOptions.mockClear();

    rerender({ isEnabled: false });

    expect(mockSetOptions).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerShown: false,
        unstable_headerLeftItems: undefined,
        unstable_headerRightItems: undefined,
      }),
    );
  });

  it('updates the items without hiding the bar', () => {
    const { rerender } = renderHook(
      ({ items }: { items: () => NativeStackHeaderItem[] }) =>
        useNativeHeader({ leftItems, rightItems: items }),
      { initialProps: { items: rightItems } },
    );
    mockSetOptions.mockClear();
    const nextRightItems = (): NativeStackHeaderItem[] => [];

    rerender({ items: nextRightItems });

    expect(mockSetOptions).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerShown: true,
        unstable_headerRightItems: nextRightItems,
      }),
    );
  });

  it('hides the native bar when the screen unmounts', () => {
    const { unmount } = renderHook(() =>
      useNativeHeader({ leftItems, rightItems }),
    );
    mockSetOptions.mockClear();

    unmount();

    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ headerShown: false }),
    );
  });
});

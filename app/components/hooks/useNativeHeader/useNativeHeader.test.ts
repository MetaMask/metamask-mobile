import { renderHook } from '@testing-library/react-native';

import {
  useIsNativeHeader,
  useNativeHeader,
  useNativeHeaderInset,
  useNativeHeaderScreenOptions,
} from './useNativeHeader';
import { selectNativeHeaderEnabled } from '../../../selectors/featureFlagController/nativeHeader';

const mockIsLiquidGlassAvailable = jest.fn();
jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => mockIsLiquidGlassAvailable(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../selectors/featureFlagController/nativeHeader', () => ({
  selectNativeHeaderEnabled: jest.fn(),
}));

const mockSetOptions = jest.fn();
const mockNavigation = { setOptions: mockSetOptions };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: jest.fn().mockReturnValue(mockTheme),
  };
});

describe('useNativeHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLiquidGlassAvailable.mockReturnValue(true);
    jest.mocked(selectNativeHeaderEnabled).mockReturnValue(true);
  });

  describe('useIsNativeHeader', () => {
    it('is on when the OS draws Liquid Glass and the flag is on', () => {
      const { result } = renderHook(() => useIsNativeHeader());

      expect(result.current).toBe(true);
    });

    it('is off when the OS cannot draw Liquid Glass', () => {
      mockIsLiquidGlassAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useIsNativeHeader());

      expect(result.current).toBe(false);
    });

    it('is off when the remote flag kills it', () => {
      jest.mocked(selectNativeHeaderEnabled).mockReturnValue(false);

      const { result } = renderHook(() => useIsNativeHeader());

      expect(result.current).toBe(false);
    });

    it('never reads the flag where the OS cannot draw Liquid Glass', () => {
      mockIsLiquidGlassAvailable.mockReturnValue(false);

      renderHook(() => useIsNativeHeader());

      expect(selectNativeHeaderEnabled).not.toHaveBeenCalled();
    });
  });

  describe('useNativeHeaderScreenOptions', () => {
    it('hides the header when the native header is off', () => {
      mockIsLiquidGlassAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useNativeHeaderScreenOptions());

      expect(result.current).toStrictEqual({ headerShown: false });
    });

    it('shows a transparent, themed bar when the native header is on', () => {
      const { result } = renderHook(() => useNativeHeaderScreenOptions());

      expect(result.current).toMatchObject({
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: expect.any(String),
        headerTitleStyle: {
          color: expect.any(String),
          fontFamily: expect.any(String),
          fontSize: expect.any(Number),
        },
      });
    });

    it('keeps the same options object across renders', () => {
      const { result, rerender } = renderHook(() =>
        useNativeHeaderScreenOptions(),
      );
      const first = result.current;

      rerender({});

      expect(result.current).toBe(first);
    });
  });

  describe('useNativeHeaderInset', () => {
    it('is zero when the native header is off', () => {
      mockIsLiquidGlassAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useNativeHeaderInset());

      expect(result.current).toBe(0);
    });

    it('covers the status bar and the compact bar when the native header is on', () => {
      const { result } = renderHook(() => useNativeHeaderInset());

      expect(result.current).toBe(59 + 44);
    });
  });

  describe('useNativeHeader', () => {
    it('does not touch navigation options when the native header is off', () => {
      mockIsLiquidGlassAvailable.mockReturnValue(false);

      const { result } = renderHook(() =>
        useNativeHeader({ title: 'Settings' }),
      );

      expect(result.current).toBe(false);
      expect(mockSetOptions).not.toHaveBeenCalled();
    });

    it('applies the title and bar items when the native header is on', () => {
      const rightItems = jest.fn(() => []);

      const { result } = renderHook(() =>
        useNativeHeader({ title: 'Settings', rightItems }),
      );

      expect(result.current).toBe(true);
      expect(mockSetOptions).toHaveBeenCalledWith({
        title: 'Settings',
        unstable_headerLeftItems: undefined,
        unstable_headerRightItems: rightItems,
        headerSearchBarOptions: undefined,
        headerLargeTitle: false,
        headerBackVisible: true,
      });
    });

    it('stays on the JS header when the caller disables it', () => {
      const { result } = renderHook(() =>
        useNativeHeader({ title: 'Embedded', isEnabled: false }),
      );

      expect(result.current).toBe(false);
      expect(mockSetOptions).not.toHaveBeenCalled();
    });

    it('sets an empty title so the route name is not printed', () => {
      renderHook(() => useNativeHeader());

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({ title: '' }),
      );
    });

    it('hides the back button and enables the large title when asked', () => {
      renderHook(() =>
        useNativeHeader({ isBackButtonHidden: true, isLargeTitle: true }),
      );

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          headerBackVisible: false,
          headerLargeTitle: true,
        }),
      );
    });

    it('re-applies only when the config changes', () => {
      const { rerender } = renderHook(
        ({ title }: { title: string }) => useNativeHeader({ title }),
        { initialProps: { title: 'A' } },
      );

      rerender({ title: 'A' });
      expect(mockSetOptions).toHaveBeenCalledTimes(1);

      rerender({ title: 'B' });
      expect(mockSetOptions).toHaveBeenCalledTimes(2);
    });
  });
});

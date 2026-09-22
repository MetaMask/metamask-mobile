import { renderHook } from '@testing-library/react-native';

import {
  useIsNativeHeader,
  useNativeHeader,
  useNativeHeaderScreenOptions,
} from './useNativeHeader';
import { selectNativeHeaderEnabled } from '../../../selectors/featureFlagController/nativeHeader';

const mockIsLiquidGlassAvailable = jest.fn();
jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => mockIsLiquidGlassAvailable(),
}));

const mockSelectorValues = new Map<unknown, unknown>();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockSelectorValues.get(selector),
}));

const mockSetOptions = jest.fn();
const mockNavigation = { setOptions: mockSetOptions };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
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
    mockSelectorValues.set(selectNativeHeaderEnabled, true);
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
      mockSelectorValues.set(selectNativeHeaderEnabled, false);

      const { result } = renderHook(() => useIsNativeHeader());

      expect(result.current).toBe(false);
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

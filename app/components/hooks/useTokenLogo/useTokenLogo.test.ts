import { renderHook, act } from '@testing-library/react-native';
import { useTokenLogo } from './useTokenLogo';

// Mock useTheme hook
const mockColors = {
  background: { default: '#FFFFFF' },
  text: { default: '#000000' },
  icon: { default: '#000000' },
  border: { muted: '#E5E7EB' },
};

const mockUseTheme = jest.fn().mockReturnValue({
  colors: mockColors,
  themeAppearance: 'light',
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));

describe('useTokenLogo', () => {
  const mockAssetsRequiringLightBg = new Set(['ETH', 'XRP']);
  const mockAssetsRequiringDarkBg = new Set(['S', 'SOPH']);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: mockColors,
      themeAppearance: 'light',
    });
  });

  describe('Initial state', () => {
    it('should return initial loading and error states as false', () => {
      const { result } = renderHook(() =>
        useTokenLogo({
          symbol: 'USDC',
          size: 44,
          assetsRequiringLightBg: mockAssetsRequiringLightBg,
          assetsRequiringDarkBg: mockAssetsRequiringDarkBg,
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('Event handlers', () => {
    it('should set loading to true and error to false on handleLoadStart', () => {
      const { result } = renderHook(() =>
        useTokenLogo({
          symbol: 'USDC',
          size: 44,
          assetsRequiringLightBg: mockAssetsRequiringLightBg,
          assetsRequiringDarkBg: mockAssetsRequiringDarkBg,
        }),
      );

      act(() => {
        result.current.handleLoadStart();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
    });

    it('should set loading to false on handleLoadEnd', () => {
      const { result } = renderHook(() =>
        useTokenLogo({
          symbol: 'USDC',
          size: 44,
          assetsRequiringLightBg: mockAssetsRequiringLightBg,
          assetsRequiringDarkBg: mockAssetsRequiringDarkBg,
        }),
      );

      act(() => {
        result.current.handleLoadStart();
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.handleLoadEnd();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should set loading to false and error to true on handleError', () => {
      const { result } = renderHook(() =>
        useTokenLogo({
          symbol: 'USDC',
          size: 44,
          assetsRequiringLightBg: mockAssetsRequiringLightBg,
          assetsRequiringDarkBg: mockAssetsRequiringDarkBg,
        }),
      );

      act(() => {
        result.current.handleLoadStart();
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.handleError();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
    });
  });

  describe('State reset on symbol change', () => {
    it('should reset loading and error states when symbol changes', () => {
      const { result, rerender } = renderHook(
        ({ symbol }) =>
          useTokenLogo({
            symbol,
            size: 44,
            assetsRequiringLightBg: mockAssetsRequiringLightBg,
            assetsRequiringDarkBg: mockAssetsRequiringDarkBg,
          }),
        {
          initialProps: { symbol: 'USDC' },
        },
      );

      act(() => {
        result.current.handleLoadStart();
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.handleError();
      });

      expect(result.current.hasError).toBe(true);

      // Change symbol
      rerender({ symbol: 'USDT' });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });
});

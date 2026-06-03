import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageStyle, ViewStyle } from 'react-native';
import { useTheme } from '../../../util/theme';

// Stable default so omitting the bg sets doesn't create a fresh Set each render
// (which would bust the background/style memoization below).
const EMPTY_SET = new Set<string>();

export interface UseTokenLogoConfig {
  symbol: string;
  size?: number;
  assetsRequiringLightBg?: Set<string>;
  assetsRequiringDarkBg?: Set<string>;
}

export interface UseTokenLogoReturn {
  isLoading: boolean;
  hasError: boolean;
  containerStyle: ViewStyle;
  loadingContainerStyle: ViewStyle;
  imageStyle: ImageStyle;
  fallbackTextStyle: {
    fontSize: number;
    fontWeight: '600';
    color: string;
  };
  handleLoadStart: () => void;
  handleLoadEnd: () => void;
  handleError: () => void;
}

/**
 * Shared hook for token logo components that handles:
 * - Loading and error state management
 * - Background color calculation based on theme and asset requirements
 * - Style calculations for container, image, and fallback text
 * - Image load event handlers
 */
export const useTokenLogo = ({
  symbol,
  size = 44,
  assetsRequiringLightBg = EMPTY_SET,
  assetsRequiringDarkBg = EMPTY_SET,
}: UseTokenLogoConfig): UseTokenLogoReturn => {
  const { colors, themeAppearance } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when symbol changes (for recycling)
  useEffect(() => {
    setIsLoading(false);
    setHasError(false);
  }, [symbol]);

  // Memoize the background checks to prevent recalculation
  const { needsLightBg, needsDarkBg } = useMemo(() => {
    const upperSymbol = symbol?.toUpperCase();
    return {
      needsLightBg: assetsRequiringLightBg.has(upperSymbol),
      needsDarkBg: assetsRequiringDarkBg.has(upperSymbol),
    };
  }, [symbol, assetsRequiringLightBg, assetsRequiringDarkBg]);

  const containerStyle: ViewStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: (() => {
        if (themeAppearance === 'dark' && needsLightBg) {
          return 'white'; // White in dark mode
        }
        if (themeAppearance === 'light' && needsDarkBg) {
          return colors.icon.default; // Black in light mode
        }
        return colors.background.default;
      })(),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: colors.border.muted,
    }),
    [size, colors, themeAppearance, needsLightBg, needsDarkBg],
  );

  const loadingContainerStyle: ViewStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: size,
      height: size,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [size],
  );

  const imageStyle: ImageStyle = useMemo(
    () => ({
      width: size,
      height: size,
    }),
    [size],
  );

  const fallbackTextStyle = useMemo(
    () => ({
      fontSize: Math.round(size * 0.4),
      fontWeight: '600' as const,
      color: colors.text.default,
    }),
    [size, colors.text.default],
  );

  // Stable handler identities so memoized children (e.g. <Image>) don't
  // re-render from new onLoadStart/onLoadEnd/onError props each render.
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  return {
    isLoading,
    hasError,
    containerStyle,
    loadingContainerStyle,
    imageStyle,
    fallbackTextStyle,
    handleLoadStart,
    handleLoadEnd,
    handleError,
  };
};

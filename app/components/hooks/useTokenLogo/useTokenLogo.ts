import { useEffect, useMemo, useState } from 'react';
import { ImageStyle, ViewStyle } from 'react-native';
import { useTheme } from '../../../util/theme';

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
  assetsRequiringLightBg = new Set<string>(),
  assetsRequiringDarkBg = new Set<string>(),
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

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

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

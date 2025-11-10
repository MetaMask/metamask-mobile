import { Image } from 'expo-image';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageStyle, View, ViewStyle } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import {
  ASSETS_REQUIRING_DARK_BG,
  ASSETS_REQUIRING_LIGHT_BG,
} from './TrendingTokenBgConfig.ts';

interface TrendingTokenLogoProps {
  assetId: string;
  symbol: string;
  size?: number;
  style?: ViewStyle;
  testID?: string;
  recyclingKey?: string; // For FlashList optimization
}

const TrendingTokenLogo: React.FC<TrendingTokenLogoProps> = ({
  assetId,
  symbol,
  size = 44,
  style,
  testID,
  recyclingKey,
}) => {
  const { colors, themeAppearance } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when symbol changes (for recycling)
  useEffect(() => {
    setIsLoading(false);
    setHasError(false);
  }, [symbol]);

  const { needsLightBg, needsDarkBg } = useMemo(() => {
    const upperSymbol = symbol?.toUpperCase();
    return {
      needsLightBg: ASSETS_REQUIRING_LIGHT_BG.has(upperSymbol),
      needsDarkBg: ASSETS_REQUIRING_DARK_BG.has(upperSymbol),
    };
  }, [symbol]);

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

  const imageUri = useMemo(() => {
    const imageUrl = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${assetId
      .split(':')
      .join('/')}.png`;
    return imageUrl;
  }, [assetId]);

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

  if (!imageUri || hasError) {
    // Get first 2 letters, uppercase
    const fallbackText = symbol.substring(0, 2).toUpperCase();

    return (
      <View style={[containerStyle, style]} testID={testID}>
        <Text variant={TextVariant.BodyMD} style={fallbackTextStyle}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {isLoading && (
        <View style={loadingContainerStyle}>
          <ActivityIndicator size="small" />
        </View>
      )}
      <Image
        key={recyclingKey || symbol} // Use recyclingKey for proper recycling
        source={{ uri: imageUri }}
        style={imageStyle}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        contentFit="contain"
        cachePolicy="memory-disk" // Persistent caching across app sessions
        recyclingKey={recyclingKey || symbol} // For FlashList optimization
        transition={0} // Disable transition for faster rendering
        priority="high" // High priority loading
        placeholder={null} // No placeholder for cleaner loading
        allowDownscaling={false} // Prevent quality loss
        autoplay={false} // SVGs don't need autoplay
      />
    </View>
  );
};

export default memo(TrendingTokenLogo);

import React, { memo, useMemo, useState, useEffect } from 'react';
import { View, ActivityIndicator, ViewStyle, ImageStyle } from 'react-native';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { useTheme } from '../../../../../util/theme';
import { PerpsTokenLogoProps } from './PerpsTokenLogo.types';
import { Image } from 'expo-image';
import { HYPERLIQUID_ASSET_ICONS_BASE_URL } from '../../constants/hyperLiquidConfig';

const PerpsTokenLogo: React.FC<PerpsTokenLogoProps> = ({
  symbol,
  size = 32,
  style,
  testID,
  recyclingKey,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when symbol changes (for recycling)
  useEffect(() => {
    setIsLoading(false);
    setHasError(false);
  }, [symbol]);

  const containerStyle: ViewStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.background.default,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
    }),
    [size, colors.background.default],
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

  // SVG URL - expo-image handles SVG rendering properly
  const imageUri = useMemo(() => {
    if (!symbol) return null;
    const upperSymbol = symbol.toUpperCase();
    return `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${upperSymbol}.svg`;
  }, [symbol]);

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

  // Show Avatar fallback if no symbol or error
  if (!symbol || !imageUri || hasError) {
    return (
      <Avatar
        variant={AvatarVariant.Token}
        name={symbol}
        size={
          size === 32
            ? AvatarSize.Md
            : size === 40
            ? AvatarSize.Lg
            : AvatarSize.Md
        }
        style={style}
        testID={testID}
      />
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

export default memo(PerpsTokenLogo);

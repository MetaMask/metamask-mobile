import { Image } from 'expo-image';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTokenLogo } from '../../../../hooks/useTokenLogo';
import {
  getAssetIconUrls,
  getPerpsDisplaySymbol,
} from '../../utils/marketUtils';
import {
  ASSETS_REQUIRING_DARK_BG,
  ASSETS_REQUIRING_LIGHT_BG,
  K_PREFIX_ASSETS,
} from './PerpsAssetBgConfig';
import { PerpsTokenLogoProps } from './PerpsTokenLogo.types';

const PerpsTokenLogo: React.FC<PerpsTokenLogoProps> = ({
  symbol,
  size = 32,
  style,
  testID,
  recyclingKey,
}) => {
  // Track if we should use fallback URL (after primary fails)
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);

  // Get both primary (MetaMask) and fallback (HyperLiquid) URLs
  const iconUrls = useMemo(() => {
    if (!symbol) return null;
    return getAssetIconUrls(symbol, K_PREFIX_ASSETS);
  }, [symbol]);

  // Reset fallback state when symbol changes
  useEffect(() => {
    setUseFallbackUrl(false);
  }, [symbol]);

  // Select current image URL based on fallback state
  const imageUri = iconUrls
    ? useFallbackUrl
      ? iconUrls.fallback
      : iconUrls.primary
    : null;

  // Extract display symbol (e.g., "TSLA" from "xyz:TSLA")
  const fallbackText = useMemo(() => {
    const displaySymbol = getPerpsDisplaySymbol(symbol || '');
    // Get first 2 letters, uppercase
    return displaySymbol.substring(0, 2).toUpperCase();
  }, [symbol]);

  const {
    isLoading,
    hasError,
    containerStyle,
    loadingContainerStyle,
    imageStyle,
    fallbackTextStyle,
    handleLoadStart,
    handleLoadEnd,
    handleError,
  } = useTokenLogo({
    symbol: symbol || '',
    size,
    assetsRequiringLightBg: ASSETS_REQUIRING_LIGHT_BG,
    assetsRequiringDarkBg: ASSETS_REQUIRING_DARK_BG,
  });

  // Handle image error with fallback logic:
  // 1. If primary URL fails, try fallback URL
  // 2. If fallback URL also fails, show text fallback
  const handleImageError = useCallback(() => {
    if (!useFallbackUrl && iconUrls?.fallback) {
      // Primary failed - try fallback URL
      setUseFallbackUrl(true);
    } else {
      // Both URLs failed - show text fallback
      handleError();
    }
  }, [useFallbackUrl, iconUrls?.fallback, handleError]);

  // Image key includes fallback state for proper re-render when switching URLs
  const imageKey = `${recyclingKey || symbol}-${useFallbackUrl ? 'fallback' : 'primary'}`;

  // Show custom two-letter fallback if no symbol or error
  if (!symbol || !imageUri || hasError) {
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
        key={imageKey}
        source={{ uri: imageUri }}
        style={imageStyle}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleImageError}
        contentFit="contain"
        cachePolicy="memory-disk" // Persistent caching across app sessions
        recyclingKey={imageKey} // For FlashList optimization
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

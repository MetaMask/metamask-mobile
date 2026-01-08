import { Image } from 'expo-image';
import React, { memo, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTokenLogo } from '../../../../hooks/useTokenLogo';
import {
  getAssetIconUrl,
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
  // SVG URL - expo-image handles SVG rendering properly
  const imageUri = useMemo(() => {
    if (!symbol) return null;
    return getAssetIconUrl(symbol, K_PREFIX_ASSETS);
  }, [symbol]);

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

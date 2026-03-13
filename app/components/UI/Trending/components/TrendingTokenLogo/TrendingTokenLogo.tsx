import { Image } from 'expo-image';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, ViewStyle } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTokenLogo } from '../../../../hooks/useTokenLogo';
import { getTrendingTokenImageUrl } from '../../utils/getTrendingTokenImageUrl';

interface TrendingTokenLogoProps {
  assetId: string;
  symbol?: string;
  /** Fallback image URI from API response (e.g. baseToken.imageUrl) tried before showing text */
  fallbackImageUri?: string;
  size?: number;
  style?: ViewStyle;
  testID?: string;
  recyclingKey?: string; // For FlashList optimization
}

const TrendingTokenLogo: React.FC<TrendingTokenLogoProps> = ({
  assetId,
  symbol,
  fallbackImageUri,
  size = 44,
  style,
  testID,
  recyclingKey,
}) => {
  const primaryImageUri = useMemo(
    () => getTrendingTokenImageUrl(assetId),
    [assetId],
  );

  // Track which URI we're currently showing: 'primary' → 'fallback' → error state
  const [activeUri, setActiveUri] = useState<string>(primaryImageUri);
  const [exhausted, setExhausted] = useState(false);

  // Reset state when assetId changes — FlashList recycles cells so useState
  // would otherwise carry over stale values from the previously rendered token.
  useEffect(() => {
    setActiveUri(primaryImageUri);
    setExhausted(false);
  }, [primaryImageUri]);

  const fallbackText = useMemo(() => {
    const displaySymbol = symbol || '';
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
    handleError: markError,
  } = useTokenLogo({
    symbol: symbol || '',
    size,
  });

  const handleError = useCallback(() => {
    if (activeUri === primaryImageUri && fallbackImageUri) {
      // First failure: try the API-provided fallback image
      setActiveUri(fallbackImageUri);
    } else {
      // Both URIs failed — surface the error state
      setExhausted(true);
      markError();
    }
  }, [activeUri, primaryImageUri, fallbackImageUri, markError]);

  // Show text fallback when: no symbol, all image sources exhausted, or hook reports error
  if (!symbol || exhausted || hasError) {
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
        key={activeUri} // Remount when URI changes to trigger a fresh load
        source={{ uri: activeUri }}
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

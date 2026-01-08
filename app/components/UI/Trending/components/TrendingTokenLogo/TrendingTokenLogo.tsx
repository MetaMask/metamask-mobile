import { Image } from 'expo-image';
import React, { memo, useMemo } from 'react';
import { ActivityIndicator, View, ViewStyle } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTokenLogo } from '../../../../hooks/useTokenLogo';
import { getTrendingTokenImageUrl } from '../../utils/getTrendingTokenImageUrl';

interface TrendingTokenLogoProps {
  assetId: string;
  symbol?: string;
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
  const imageUri = useMemo(() => getTrendingTokenImageUrl(assetId), [assetId]);

  const fallbackText = useMemo(() => {
    const displaySymbol = symbol || '';
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
  });

  // Show custom two-letter fallback if no symbol or error
  if (!symbol || hasError) {
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

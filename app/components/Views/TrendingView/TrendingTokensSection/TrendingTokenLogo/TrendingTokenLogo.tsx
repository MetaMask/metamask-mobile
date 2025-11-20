import { Image } from 'expo-image';
import React, { memo, useMemo } from 'react';
import { ActivityIndicator, View, ViewStyle } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTokenLogo } from '../../../../hooks/useTokenLogo';

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
  const imageUri = useMemo(() => {
    const imageUrl = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${assetId
      .split(':')
      .join('/')}.png`;
    return imageUrl;
  }, [assetId]);

  const fallbackText = useMemo(
    () => symbol.substring(0, 2).toUpperCase(),
    [symbol],
  );

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
    symbol,
    size,
  });

  if (!imageUri || hasError) {
    return (
      <View accessibilityRole="none" accessible={false} style={[containerStyle, style]} testID={testID}>
        <Text variant={TextVariant.BodyMD} style={fallbackTextStyle}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <View accessibilityRole="none" accessible={false} style={[containerStyle, style]} testID={testID}>
      {isLoading && (
        <View accessibilityRole="none" accessible={false} style={loadingContainerStyle}>
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

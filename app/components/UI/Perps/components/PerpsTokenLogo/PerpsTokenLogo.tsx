import { Image } from 'expo-image';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { getAssetIconUrls } from '../../utils/marketUtils';
import { K_PREFIX_ASSETS } from './PerpsAssetBgConfig';
import { PerpsTokenLogoProps } from './PerpsTokenLogo.types';

const imageStyle = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});

function mapToAvatarBaseSize(pixels: number): AvatarBaseSize {
  if (pixels <= 16) return AvatarBaseSize.Xs;
  if (pixels <= 24) return AvatarBaseSize.Sm;
  if (pixels <= 32) return AvatarBaseSize.Md;
  if (pixels <= 40) return AvatarBaseSize.Lg;
  return AvatarBaseSize.Xl;
}

const PerpsTokenLogo: React.FC<PerpsTokenLogoProps> = ({
  symbol,
  size = 32,
  testID,
  recyclingKey,
}) => {
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  const [hasError, setHasError] = useState(false);

  const iconUrls = useMemo(() => {
    if (!symbol) return null;
    return getAssetIconUrls(symbol, K_PREFIX_ASSETS);
  }, [symbol]);

  useEffect(() => {
    setUseFallbackUrl(false);
    setHasError(false);
  }, [symbol]);

  const imageUri = iconUrls
    ? useFallbackUrl
      ? iconUrls.fallback
      : iconUrls.primary
    : null;

  const fallbackText = useMemo(() => {
    const displaySymbol = getPerpsDisplaySymbol(symbol || '');
    return displaySymbol.substring(0, 2).toUpperCase();
  }, [symbol]);

  // Handle image error with dual-URL fallback:
  // 1. If primary URL fails, try the HyperLiquid fallback URL
  // 2. If fallback URL also fails, show text fallback
  const handleImageError = useCallback(() => {
    if (!useFallbackUrl && iconUrls?.fallback) {
      setUseFallbackUrl(true);
    } else {
      setHasError(true);
    }
  }, [useFallbackUrl, iconUrls?.fallback]);

  const showFallback = !symbol || !imageUri || hasError;

  const imageKey = `${recyclingKey || symbol}-${useFallbackUrl ? 'fallback' : 'primary'}`;

  return (
    <AvatarBase
      size={mapToAvatarBaseSize(size)}
      shape={AvatarBaseShape.Circle}
      fallbackText={showFallback ? fallbackText : undefined}
      testID={testID}
      twClassName={`w-[${size}px] h-[${size}px]`}
    >
      {!showFallback && imageUri ? (
        <Image
          key={imageKey}
          source={{ uri: imageUri }}
          style={imageStyle.fill}
          onError={handleImageError}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={imageKey}
          transition={0}
          priority="high"
          placeholder={null}
          allowDownscaling={false}
          autoplay={false}
        />
      ) : null}
    </AvatarBase>
  );
};

export default memo(PerpsTokenLogo);

import { Image } from 'expo-image';
import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { useTheme } from '../../../../../util/theme';
import { getAssetIconUrls } from '../../utils/marketUtils';
import {
  recordFailedPerpsIconUrl,
  selectAvailablePerpsIconUrl,
  useFailedPerpsIconUrlRevision,
} from './failedPerpsIconUrls';
import {
  ASSETS_REQUIRING_DARK_BG,
  ASSETS_REQUIRING_LIGHT_BG,
  K_PREFIX_ASSETS,
} from './PerpsAssetBgConfig';
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
  const { colors, themeAppearance } = useTheme();
  // Subscribes every instance to the session cache so one miss updates them all.
  useFailedPerpsIconUrlRevision();

  // Re-apply theme-aware background for tokens that need contrast in certain themes:
  // - Tokens with dark logos (e.g. ETH, XRP) need a white bg in dark mode
  // - Tokens with light logos (e.g. S, IO) need a dark bg in light mode
  const backgroundColor = useMemo(() => {
    const upperSymbol = symbol?.toUpperCase() ?? '';
    if (
      themeAppearance === 'dark' &&
      ASSETS_REQUIRING_LIGHT_BG.has(upperSymbol)
    ) {
      return 'white';
    }
    if (
      themeAppearance === 'light' &&
      ASSETS_REQUIRING_DARK_BG.has(upperSymbol)
    ) {
      return colors.icon.default;
    }
    return undefined;
  }, [symbol, themeAppearance, colors.icon.default]);

  const iconUrls = useMemo(() => {
    if (!symbol) return null;
    return getAssetIconUrls(symbol, K_PREFIX_ASSETS);
  }, [symbol]);

  const imageUri = selectAvailablePerpsIconUrl(iconUrls);

  const fallbackText = useMemo(() => {
    const displaySymbol = getPerpsDisplaySymbol(symbol || '');
    return displaySymbol.substring(0, 2).toUpperCase();
  }, [symbol]);

  // 1. Primary (MetaMask) fails → remember it and try the Hyperliquid URL.
  // 2. Fallback fails → remember it and show the monogram.
  // Do not log here. expo-image already reports the native failure; a JS log
  // would add another Sentry breadcrumb for an expected miss.
  const handleImageError = useCallback(() => {
    if (!imageUri) {
      return;
    }

    recordFailedPerpsIconUrl(imageUri);
  }, [imageUri]);

  const showFallback = !symbol || !imageUri;

  const imageKey = `${recyclingKey || symbol}-${imageUri}`;

  return (
    <AvatarBase
      size={mapToAvatarBaseSize(size)}
      shape={AvatarBaseShape.Circle}
      fallbackText={showFallback ? fallbackText : undefined}
      fallbackTextProps={
        showFallback && testID ? { testID: `${testID}-fallback` } : undefined
      }
      testID={testID}
      twClassName={`w-[${size}px] h-[${size}px]`}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={backgroundColor ? ({ backgroundColor } as any) : undefined}
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

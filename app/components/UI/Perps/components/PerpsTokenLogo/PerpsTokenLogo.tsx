import { Image } from 'expo-image';
import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  BadgeNetwork,
  Box,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import hyperliquidLogo from '../PerpsProviderLogos/assets/hyperliquid.png';
import lighterLogo from '../PerpsProviderLogos/assets/lighter.png';
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

/**
 * Venue marks for the token badge (TAT-4418). The design's header token
 * (32px AvatarToken) carries a BadgeNetwork venue mark with its own
 * background ring, overlapping the bottom-right corner.
 */
const VENUE_BADGE_LOGOS: Record<PerpsProviderType, number> = {
  hyperliquid: hyperliquidLogo as number,
  lighter: lighterLogo as number,
};

const PerpsTokenLogo: React.FC<PerpsTokenLogoProps> = ({
  symbol,
  size = 32,
  testID,
  recyclingKey,
  providerId,
}) => {
  const { colors, themeAppearance } = useTheme();
  // Pass this revision into the selector. React Compiler memoizes on the
  // values it can see; discarding the snapshot and reading the module set
  // would keep the previous URL after a miss.
  const failedIconUrlRevision = useFailedPerpsIconUrlRevision();

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

  const imageUri = useMemo(
    () => selectAvailablePerpsIconUrl(iconUrls, failedIconUrlRevision),
    [iconUrls, failedIconUrlRevision],
  );

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

  const avatar = (
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

  if (!providerId) {
    return avatar;
  }
  const venueBadge = VENUE_BADGE_LOGOS[providerId];
  if (!venueBadge) {
    return avatar;
  }

  // Venue mark on the token (TAT-4418): the design's BadgeNetwork with its
  // background ring, overlapping the bottom-right corner. It names the
  // exchange the trade goes to.
  return (
    <Box twClassName="relative" testID={testID ? `${testID}-venue` : undefined}>
      {avatar}
      <Box twClassName="absolute -bottom-1 -right-1">
        <BadgeNetwork
          src={venueBadge}
          name={PROVIDER_DISPLAY_INFO[providerId].name}
          accessible={false}
          testID={testID ? `${testID}-venue-badge` : undefined}
        />
      </Box>
    </Box>
  );
};

export default memo(PerpsTokenLogo);

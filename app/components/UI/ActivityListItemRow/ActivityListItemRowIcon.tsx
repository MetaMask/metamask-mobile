import React, { useEffect, useMemo } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import type { TokenAmount } from '../../../util/activity-adapters';
import type { ActivityListItemRowStyles } from './ActivityListItemRow.styles';
import { getTokenImageSource } from './tokenIcon';

function getImageUri(
  source: ImageSourcePropType | undefined,
): string | undefined {
  if (source && typeof source === 'object' && 'uri' in source) {
    return source.uri;
  }

  return undefined;
}

function TokenAvatar({
  fallbackIcon,
  iconUrl,
  styles,
  tokens,
}: {
  fallbackIcon: ImageSourcePropType;
  iconUrl?: string;
  styles: ActivityListItemRowStyles;
  tokens: TokenAmount[];
}) {
  const tokenImageSources = useMemo(
    () =>
      tokens.map((token, index) =>
        // An explicit iconUrl (HyperLiquid market icon) overrides the
        // token-derived source for the single-avatar case.
        index === 0 && iconUrl ? { uri: iconUrl } : getTokenImageSource(token),
      ),
    [tokens, iconUrl],
  );

  useEffect(() => {
    tokenImageSources.forEach((source) => {
      const uri = getImageUri(source);
      if (uri) {
        Image.prefetch(uri);
      }
    });
  }, [tokenImageSources]);

  if (tokens.length === 0) {
    if (iconUrl) {
      return <AvatarToken src={{ uri: iconUrl }} size={AvatarTokenSize.Md} />;
    }
    return (
      <Image source={fallbackIcon} style={styles.icon} resizeMode="stretch" />
    );
  }

  if (tokens.length === 1) {
    const [token] = tokens;
    return (
      <AvatarToken
        name={token.symbol}
        src={tokenImageSources[0]}
        size={AvatarTokenSize.Md}
      />
    );
  }

  const [sourceToken, destinationToken] = tokens;

  return (
    <View style={styles.tokenIconStack}>
      <View style={styles.tokenIconStackBack}>
        <AvatarToken
          name={sourceToken.symbol}
          src={tokenImageSources[0]}
          size={AvatarTokenSize.Md}
        />
      </View>
      <View style={styles.tokenIconStackFront}>
        <AvatarToken
          name={destinationToken.symbol}
          src={tokenImageSources[1]}
          size={AvatarTokenSize.Md}
          style={styles.tokenIconStackFrontImage}
        />
      </View>
      <View style={styles.tokenIconStackDivider} />
    </View>
  );
}

export function ActivityListItemRowIcon({
  fallbackIcon,
  iconUrl,
  networkImageSource,
  styles,
  tokens,
}: {
  fallbackIcon: ImageSourcePropType;
  /** Explicit avatar image URL (e.g. HyperLiquid market icon) for the single-avatar case. */
  iconUrl?: string;
  /**
   * Network badge source. Omitted for single-network domains (perps =
   * Arbitrum, predict = Polygon) where the badge adds no information, so the
   * avatar renders without it.
   */
  networkImageSource?: ImageSourcePropType;
  styles: ActivityListItemRowStyles;
  tokens: TokenAmount[];
}) {
  useEffect(() => {
    const uri = getImageUri(networkImageSource);
    if (uri) {
      Image.prefetch(uri);
    }
  }, [networkImageSource]);

  const avatar = (
    <TokenAvatar
      fallbackIcon={fallbackIcon}
      iconUrl={iconUrl}
      styles={styles}
      tokens={tokens}
    />
  );

  if (!networkImageSource) {
    return avatar;
  }

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <BadgeNetwork
          src={
            networkImageSource as React.ComponentProps<
              typeof BadgeNetwork
            >['src']
          }
        />
      }
    >
      {avatar}
    </BadgeWrapper>
  );
}

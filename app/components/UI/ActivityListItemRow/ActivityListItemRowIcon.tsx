import React, { useEffect, useMemo } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
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
    return (
      <Image source={fallbackIcon} style={styles.icon} resizeMode="stretch" />
    );
  }

  if (tokens.length === 1) {
    const [token] = tokens;
    return (
      <AvatarToken
        name={token.symbol}
        imageSource={tokenImageSources[0]}
        size={AvatarSize.Md}
        isIpfsGatewayCheckBypassed
      />
    );
  }

  const [sourceToken, destinationToken] = tokens;

  return (
    <View style={styles.tokenIconStack}>
      <View style={styles.tokenIconStackBack}>
        <AvatarToken
          name={sourceToken.symbol}
          imageSource={tokenImageSources[0]}
          size={AvatarSize.Md}
          isIpfsGatewayCheckBypassed
        />
      </View>
      <View style={styles.tokenIconStackFront}>
        <AvatarToken
          name={destinationToken.symbol}
          imageSource={tokenImageSources[1]}
          size={AvatarSize.Md}
          isIpfsGatewayCheckBypassed
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
      badgePosition={{ bottom: -4, right: -4 }}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          imageSource={networkImageSource}
          isScaled={false}
          size={AvatarSize.Xs}
        />
      }
    >
      {avatar}
    </BadgeWrapper>
  );
}

import React, { useEffect, useMemo } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import imageIcons from '../../../images/image-icons';
import type { TokenAmount } from '../../../util/activity-adapters';
import type { ActivityListItemRowStyles } from './ActivityListItemRow.styles';

function getTokenIconUrl(assetId: string | undefined): string | undefined {
  if (!assetId) return undefined;

  const formattedAssetId = assetId.startsWith('eip155:')
    ? assetId.toLowerCase()
    : assetId;

  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${formattedAssetId
    .split(':')
    .join('/')}.png`;
}

function getTokenImageSource(
  token: TokenAmount | undefined,
): ImageSourcePropType | undefined {
  const symbol = token?.symbol;

  if (symbol && Object.keys(imageIcons).includes(symbol)) {
    const localIcon = imageIcons[symbol as keyof typeof imageIcons];
    if (typeof localIcon !== 'function' && typeof localIcon !== 'string') {
      return localIcon as ImageSourcePropType;
    }
  }

  const iconUrl = getTokenIconUrl(token?.assetId);
  return iconUrl ? { uri: iconUrl } : undefined;
}

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
  styles,
  tokens,
}: {
  fallbackIcon: ImageSourcePropType;
  styles: ActivityListItemRowStyles;
  tokens: TokenAmount[];
}) {
  const tokenImageSources = useMemo(
    () => tokens.map((token) => getTokenImageSource(token)),
    [tokens],
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
  networkImageSource,
  styles,
  tokens,
}: {
  fallbackIcon: ImageSourcePropType;
  networkImageSource: ImageSourcePropType;
  styles: ActivityListItemRowStyles;
  tokens: TokenAmount[];
}) {
  useEffect(() => {
    const uri = getImageUri(networkImageSource);
    if (uri) {
      Image.prefetch(uri);
    }
  }, [networkImageSource]);

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
      <TokenAvatar
        fallbackIcon={fallbackIcon}
        styles={styles}
        tokens={tokens}
      />
    </BadgeWrapper>
  );
}

import React, { useMemo } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
} from '@metamask/design-system-react-native';
import imageIcons from '../../../../images/image-icons';
import { getNetworkImageSource } from '../../../../util/networks';
import type { TokenAmount } from '../../../../util/activity-adapters';

type TokenImageSrc = number | { uri: string };

function getTokenIconUrl(assetId: string | undefined): string | undefined {
  if (!assetId) {
    return undefined;
  }

  const formattedAssetId = assetId.startsWith('eip155:')
    ? assetId.toLowerCase()
    : assetId;

  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${formattedAssetId
    .split(':')
    .join('/')}.png`;
}

function getTokenImageSource(
  token: TokenAmount | undefined,
): TokenImageSrc | undefined {
  const symbol = token?.symbol;

  if (symbol && Object.keys(imageIcons).includes(symbol)) {
    const localIcon = imageIcons[symbol as keyof typeof imageIcons];
    if (typeof localIcon !== 'function' && typeof localIcon !== 'string') {
      return localIcon as TokenImageSrc;
    }
  }

  const iconUrl = getTokenIconUrl(token?.assetId);
  return iconUrl ? { uri: iconUrl } : undefined;
}

/**
 * Renders one or two overlapping token avatars for the details amount header,
 * optionally badged with the network icon. Mirrors the avatar rendering of the
 * redesigned activity list row.
 */
export function ActivityDetailsAvatar({
  tokens,
  size = AvatarTokenSize.Xl,
  chainId,
  showNetworkBadge = false,
}: {
  tokens: TokenAmount[];
  size?: AvatarTokenSize;
  chainId?: string;
  showNetworkBadge?: boolean;
}) {
  const imageSources = useMemo(
    () => tokens.map((token) => getTokenImageSource(token)),
    [tokens],
  );

  const networkImage =
    showNetworkBadge && chainId
      ? getNetworkImageSource({ chainId })
      : undefined;

  if (tokens.length === 0) {
    return null;
  }

  const avatar =
    tokens.length === 1 ? (
      <AvatarToken name={tokens[0].symbol} src={imageSources[0]} size={size} />
    ) : (
      <Box twClassName="flex-row">
        <AvatarToken
          name={tokens[0].symbol}
          src={imageSources[0]}
          size={size}
        />
        <Box twClassName="-ml-2">
          <AvatarToken
            name={tokens[1].symbol}
            src={imageSources[1]}
            size={size}
          />
        </Box>
      </Box>
    );

  if (networkImage) {
    return (
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={<BadgeNetwork src={networkImage} />}
      >
        {avatar}
      </BadgeWrapper>
    );
  }

  return avatar;
}

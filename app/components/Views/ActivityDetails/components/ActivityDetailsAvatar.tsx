import React, { useMemo } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../util/networks';
import type { TokenAmount } from '../../../../util/activity-adapters';
import { getTokenImageSource } from '../../../UI/ActivityListItemRow/tokenIcon';

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
  iconUrl,
}: {
  tokens: TokenAmount[];
  size?: AvatarTokenSize;
  chainId?: string;
  showNetworkBadge?: boolean;
  /** Explicit image URL (e.g. resolved NFT artwork) overriding the first avatar. */
  iconUrl?: string;
}) {
  const imageSources = useMemo(
    () =>
      tokens.map((token, index) =>
        // An explicit iconUrl (resolved NFT artwork) overrides the
        // token-derived source for the leading avatar.
        index === 0 && iconUrl ? { uri: iconUrl } : getTokenImageSource(token),
      ),
    [tokens, iconUrl],
  );

  const networkImage =
    showNetworkBadge && chainId
      ? getNetworkImageSource({ chainId })
      : undefined;

  // With no token to derive an avatar from (e.g. a nameless NFT) still show the
  // explicit artwork when we have it; otherwise render nothing.
  if (tokens.length === 0) {
    if (!iconUrl) {
      return null;
    }

    const imageOnlyAvatar = <AvatarToken src={{ uri: iconUrl }} size={size} />;
    return networkImage ? (
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={<BadgeNetwork src={networkImage} />}
      >
        {imageOnlyAvatar}
      </BadgeWrapper>
    ) : (
      imageOnlyAvatar
    );
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

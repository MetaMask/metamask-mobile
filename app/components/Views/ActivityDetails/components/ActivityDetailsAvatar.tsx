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

// Mirrors the extension's activity avatar: an unresolved/unknown token image
// falls back to a "?" glyph — a clear "unknown token" state rather than a
// partial letter or empty placeholder.
const UNKNOWN_TOKEN_FALLBACK_TEXT = '?';

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
  iconUrl?: string;
}) {
  const imageSources = useMemo(
    () =>
      tokens.map((token, index) =>
        index === 0 && iconUrl ? { uri: iconUrl } : getTokenImageSource(token),
      ),
    [tokens, iconUrl],
  );

  const networkImage =
    showNetworkBadge && chainId
      ? getNetworkImageSource({ chainId })
      : undefined;

  if (tokens.length === 0) {
    if (!iconUrl) {
      return null;
    }

    const imageOnlyAvatar = (
      <AvatarToken
        src={{ uri: iconUrl }}
        size={size}
        fallbackText={UNKNOWN_TOKEN_FALLBACK_TEXT}
      />
    );
    return networkImage ? (
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={<BadgeNetwork twClassName="rounded-md" src={networkImage} />}
      >
        {imageOnlyAvatar}
      </BadgeWrapper>
    ) : (
      imageOnlyAvatar
    );
  }

  const avatar =
    tokens.length === 1 ? (
      <AvatarToken
        name={tokens[0].symbol}
        src={imageSources[0]}
        size={size}
        fallbackText={UNKNOWN_TOKEN_FALLBACK_TEXT}
      />
    ) : (
      <Box twClassName="flex-row">
        <AvatarToken
          name={tokens[0].symbol}
          src={imageSources[0]}
          size={size}
          fallbackText={UNKNOWN_TOKEN_FALLBACK_TEXT}
        />
        <Box twClassName="-ml-2">
          <AvatarToken
            name={tokens[1].symbol}
            src={imageSources[1]}
            size={size}
            fallbackText={UNKNOWN_TOKEN_FALLBACK_TEXT}
          />
        </Box>
      </Box>
    );

  if (networkImage) {
    return (
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={<BadgeNetwork twClassName="rounded-md" src={networkImage} />}
      >
        {avatar}
      </BadgeWrapper>
    );
  }

  return avatar;
}

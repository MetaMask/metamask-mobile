import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import React from 'react';
import type { Hex } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../../util/networks';

export const FEED_TOKEN_ICON_TEST_ID = 'feed-token-icon';

interface FeedTokenIconProps {
  /** Token symbol used for the monogram fallback. */
  symbol: string;
  /** Hex chain id for the network badge image. Omit for perps. */
  chainIdHex?: Hex;
  size?: AvatarTokenSize;
}

/**
 * Token avatar with an optional network badge for a feed row.
 *
 * A round `AvatarToken` (monogram fallback from the symbol) with a circular
 * network badge sourced from `getNetworkImageSource`. Perps have no chain, so
 * the badge is omitted.
 */
const FeedTokenIcon: React.FC<FeedTokenIconProps> = ({
  symbol,
  chainIdHex,
  size = AvatarTokenSize.Md,
}) => {
  const avatar = (
    <AvatarToken name={symbol} size={size} testID={FEED_TOKEN_ICON_TEST_ID} />
  );

  if (!chainIdHex) {
    return avatar;
  }

  const networkImageSource = getNetworkImageSource({ chainId: chainIdHex });

  if (!networkImageSource) {
    return avatar;
  }

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <BadgeNetwork
          twClassName="rounded-md"
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
};

export default FeedTokenIcon;

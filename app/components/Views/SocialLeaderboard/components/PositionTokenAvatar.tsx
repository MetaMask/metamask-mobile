import React, { useEffect, useMemo, useState } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { getAssetImageUrl } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import PerpsTokenLogo from '../../../UI/Perps/components/PerpsTokenLogo';
import {
  chainNameToId,
  getPositionNetworkBadge,
  HYPERLIQUID_CHAIN_NAME,
} from '../utils/chainMapping';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';

/**
 * Minimal position shape the avatar needs. Lets non-`Position` callers (e.g. the
 * trader feed, which maps to its own row model) reuse this component without
 * fabricating a full `Position`. A full `Position` is assignable to it.
 */
export type PositionTokenAvatarData = Pick<
  Position,
  'positionId' | 'chain' | 'tokenAddress' | 'tokenImageUrl' | 'tokenSymbol'
>;

export interface PositionTokenAvatarProps {
  position: PositionTokenAvatarData;
  size?: AvatarTokenSize;
  showChainBadge?: boolean;
}

type ImageSource = 'clicker' | 'metamask' | 'none';

// AvatarTokenSize is a string token ('xs'..'xl'); PerpsTokenLogo takes a pixel
// size. Mirrors the design-system AvatarBase sizing so the perps logo matches
// the AvatarToken used for every other chain.
const AVATAR_TOKEN_SIZE_TO_PIXELS: Record<AvatarTokenSize, number> = {
  [AvatarTokenSize.Xs]: 16,
  [AvatarTokenSize.Sm]: 24,
  [AvatarTokenSize.Md]: 32,
  [AvatarTokenSize.Lg]: 40,
  [AvatarTokenSize.Xl]: 48,
};

/**
 * Renders the token avatar with a three-step fallback chain:
 * 1. Social API-provided URL (`position.tokenImageUrl`)
 * 2. MetaMask static CDN URL (derived from tokenAddress + chain)
 * 3. AvatarToken text monogram (first letter of tokenSymbol)
 */
const PositionTokenAvatarComponent: React.FC<PositionTokenAvatarProps> = ({
  position,
  size = AvatarTokenSize.Lg,
  showChainBadge = false,
}) => {
  // Hyperliquid perps key on a perp symbol rather than a token contract, so the
  // EVM/Solana resolution (Clicker URL → MetaMask CDN) can't serve their icons
  // — and the Clicker-provided `tokenImageUrl` is unreliable for them (blank or
  // dark-on-transparent placeholders). Reuse the Perps feature's symbol-based
  // logo resolution, which already maps these dark logos onto a contrasting
  // background and falls back to the Hyperliquid asset CDN.
  const isHyperliquid = position.chain.toLowerCase() === HYPERLIQUID_CHAIN_NAME;

  const caipChainId = useMemo(
    () => chainNameToId(position.chain),
    [position.chain],
  );

  // Resolved separately from `caipChainId` so Hyperliquid (perps) — which is
  // intentionally absent from the spot chain map — still gets its network badge.
  const networkBadge = useMemo(
    () => getPositionNetworkBadge(position.chain),
    [position.chain],
  );

  const metamaskUrl = useMemo(() => {
    if (!caipChainId) return undefined;
    return getAssetImageUrl(position.tokenAddress, caipChainId);
  }, [caipChainId, position.tokenAddress]);

  const initialSource = useMemo((): ImageSource => {
    if (position.tokenImageUrl) return 'clicker';
    if (metamaskUrl) return 'metamask';
    return 'none';
  }, [position.tokenImageUrl, metamaskUrl]);

  const [source, setSource] = useState<ImageSource>(initialSource);

  // Reset when the underlying position data changes (e.g. row recycling).
  // Keyed on raw position fields rather than `initialSource` because `initialSource`
  // is a derived string that can remain `'clicker'` across two different positions
  // that both have a tokenImageUrl — which would leave stale fallback state in place.
  useEffect(() => {
    setSource(initialSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.tokenImageUrl, position.tokenAddress, position.chain]);

  const src = useMemo(() => {
    if (source === 'clicker' && position.tokenImageUrl) {
      return { uri: position.tokenImageUrl };
    }
    if (source === 'metamask' && metamaskUrl) {
      return { uri: metamaskUrl };
    }
    return undefined;
  }, [source, position.tokenImageUrl, metamaskUrl]);

  const handleImageError = () => {
    setSource((prev) => {
      if (prev === 'clicker') return metamaskUrl ? 'metamask' : 'none';
      return 'none';
    });
  };

  const avatar = isHyperliquid ? (
    <PerpsTokenLogo
      symbol={position.tokenSymbol}
      size={AVATAR_TOKEN_SIZE_TO_PIXELS[size]}
      recyclingKey={position.tokenSymbol}
    />
  ) : (
    <AvatarToken
      name={position.tokenSymbol}
      src={src}
      size={size}
      imageOrSvgProps={{
        onImageError: handleImageError,
        onSvgError: handleImageError,
      }}
    />
  );

  if (showChainBadge && networkBadge) {
    return (
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <BadgeNetwork
            name={networkBadge.name}
            imageSource={networkBadge.imageSource}
          />
        }
      >
        {avatar}
      </BadgeWrapper>
    );
  }

  return avatar;
};

const PositionTokenAvatar = React.memo(
  PositionTokenAvatarComponent,
  (prev, next) =>
    prev.size === next.size &&
    prev.showChainBadge === next.showChainBadge &&
    prev.position.positionId === next.position.positionId &&
    prev.position.tokenAddress === next.position.tokenAddress &&
    prev.position.chain === next.position.chain &&
    prev.position.tokenSymbol === next.position.tokenSymbol &&
    prev.position.tokenImageUrl === next.position.tokenImageUrl,
);

export default PositionTokenAvatar;

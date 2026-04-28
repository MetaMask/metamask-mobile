import React, { useEffect, useMemo, useState } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { getAssetImageUrl } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { chainNameToId } from '../utils/chainMapping';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import { getNetworkImageSource } from '../../../../util/networks';

export interface PositionTokenAvatarProps {
  position: Position;
  size?: AvatarTokenSize;
  showChainBadge?: boolean;
}

type ImageSource = 'clicker' | 'metamask' | 'none';

/**
 * Renders the token avatar with a three-step fallback chain:
 * 1. Social API-provided URL (`position.tokenImageUrl`)
 * 2. MetaMask static CDN URL (derived from tokenAddress + chain)
 * 3. AvatarToken text monogram (first letter of tokenSymbol)
 */
const PositionTokenAvatar: React.FC<PositionTokenAvatarProps> = ({
  position,
  size = AvatarTokenSize.Lg,
  showChainBadge = false,
}) => {
  const caipChainId = useMemo(
    () => chainNameToId(position.chain),
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

  const avatar = (
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

  if (showChainBadge && caipChainId) {
    return (
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <BadgeNetwork
            name={position.chain}
            imageSource={getNetworkImageSource({ chainId: caipChainId })}
          />
        }
      >
        {avatar}
      </BadgeWrapper>
    );
  }

  return avatar;
};

export default PositionTokenAvatar;

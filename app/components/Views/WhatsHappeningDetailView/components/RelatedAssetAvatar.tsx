import React, { memo, useMemo } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import PerpsTokenLogo from '../../../UI/Perps/components/PerpsTokenLogo/PerpsTokenLogo';
import type { RelatedAssetImage } from '../utils/getRelatedAssetImageSource';

/** Maps pixel sizes to the nearest AvatarTokenSize enum value. */
const PIXEL_TO_AVATAR_TOKEN_SIZE: Partial<Record<number, AvatarTokenSize>> = {
  16: AvatarTokenSize.Xs,
  24: AvatarTokenSize.Sm,
  32: AvatarTokenSize.Md,
  40: AvatarTokenSize.Lg,
  48: AvatarTokenSize.Xl,
};

const DEFAULT_SIZE = 40;

interface RelatedAssetAvatarProps {
  name: string;
  image: RelatedAssetImage;
  /**
   * Pixel size for the avatar. Standard values: 16, 24, 32, 40 (default), 48.
   * Passed directly to PerpsTokenLogo; mapped to AvatarTokenSize for AvatarToken.
   */
  size?: number;
}

/**
 * Routes to the correct renderer based on the discriminated `image` kind.
 * `perps` uses `PerpsTokenLogo` (expo-image, primary→fallback→letter) because
 * `AvatarToken`/`ImageOrSvg` cannot reliably display remote SVGs.
 * `bundled`/`png` use `AvatarToken`. `undefined` renders a letter avatar.
 */
const RelatedAssetAvatar: React.FC<RelatedAssetAvatarProps> = ({
  name,
  image,
  size = DEFAULT_SIZE,
}) => {
  const avatarTokenSize =
    PIXEL_TO_AVATAR_TOKEN_SIZE[size] ?? AvatarTokenSize.Lg;

  const stableSrc = useMemo(() => {
    if (!image) return undefined;
    if (image.kind === 'bundled') return image.source;
    if (image.kind === 'png') return { uri: image.uri };
    return undefined;
  }, [image]);

  if (image?.kind === 'perps') {
    return <PerpsTokenLogo symbol={image.symbol} size={size} />;
  }

  return <AvatarToken name={name} size={avatarTokenSize} src={stableSrc} />;
};

export default memo(RelatedAssetAvatar);

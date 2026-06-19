import React from 'react';
import { Image } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
} from '@metamask/design-system-react-native';
import { hasRealAvatar } from '../utils/avatarFallback';

/** Maps a pixel diameter to the nearest AvatarAccount size token. */
const toAvatarAccountSize = (size: number): AvatarAccountSize => {
  if (size <= 16) return AvatarAccountSize.Xs;
  if (size <= 24) return AvatarAccountSize.Sm;
  if (size <= 32) return AvatarAccountSize.Md;
  if (size <= 40) return AvatarAccountSize.Lg;
  return AvatarAccountSize.Xl;
};

export interface TraderAvatarProps {
  /**
   * Backend-provided avatar URL. Missing, empty, or known shared placeholder
   * URLs fall through to the address-derived Maskicon.
   */
  imageUrl?: string | null;
  /** Wallet address used to derive the Maskicon fallback. */
  address?: string;
  /** Avatar diameter in pixels. */
  size: number;
  /**
   * Stable identity for the rendered cell. When set, expo-image reuses the
   * decoded/cached image across FlatList cell recycling instead of re-fetching
   * it. Pass the list item's key (e.g. `trader.id`) on recycled surfaces.
   */
  recyclingKey?: string;
  testID?: string;
}

/**
 * TraderAvatar -- renders a trader's profile image when a real one is
 * available, otherwise falls back to the address-derived Maskicon identicon.
 *
 * Centralizes the `hasRealAvatar` + Maskicon-fallback pattern shared across the
 * follow-trading surfaces (leaderboard rows/cards, profile and position
 * headers, and trade rows) so the fallback stays consistent everywhere.
 */
const TraderAvatar: React.FC<TraderAvatarProps> = ({
  imageUrl,
  address,
  size,
  recyclingKey,
  testID,
}) => {
  const tw = useTailwind();

  if (hasRealAvatar(imageUrl)) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          { width: size, height: size, borderRadius: size / 2 },
          tw.style('bg-muted'),
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
        testID={testID}
      />
    );
  }

  return (
    <AvatarAccount
      variant={AvatarAccountVariant.Maskicon}
      address={address ?? ''}
      size={toAvatarAccountSize(size)}
      twClassName={`w-[${size}px] h-[${size}px] rounded-full`}
      maskiconProps={{ size }}
      testID={testID}
    />
  );
};

export default TraderAvatar;

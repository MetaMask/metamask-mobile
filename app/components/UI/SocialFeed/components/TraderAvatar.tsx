import React from 'react';
import { Image } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
} from '@metamask/design-system-react-native';
import {
  isFoxiconAvatarUrl,
  parseFoxiconAvatarUrl,
} from '../../../Views/SocialLeaderboard/MyProfileView/avatarPresets';
import ProfileAvatar from '../../../Views/SocialLeaderboard/MyProfileView/components/ProfileAvatar';
import { hasRealAvatar } from '../utils/avatarFallback';
import { resolveTraderAvatarSeed } from '../utils/resolveTraderAvatarSeed';

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
   * Backend-provided avatar URL. A `foxicon://` preset renders the same
   * artwork as the profile page. Missing, empty, unknown foxicon, or known
   * shared placeholder URLs fall through to the address-derived Maskicon.
   */
  imageUrl?: string | null;
  /**
   * Wallet address. When present, this seeds the Maskicon so it matches the
   * trader profile. A blank address falls back to `profileId`.
   */
  address?: string | null;
  /**
   * Profile id used when `address` is missing, so traders without a wallet
   * still get distinct icons.
   */
  profileId?: string | null;
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
 * available, otherwise falls back to a Maskicon seeded by the wallet address,
 * or by the profile id when that address is missing.
 * `foxicon://{preset}/{background}` URLs render the local profile preset.
 *
 * Centralizes the `hasRealAvatar` + Maskicon-fallback pattern shared across the
 * follow-trading surfaces (leaderboard rows/cards, profile and position
 * headers, and trade rows) so the fallback stays consistent everywhere.
 */
const TraderAvatar: React.FC<TraderAvatarProps> = ({
  imageUrl,
  address,
  profileId,
  size,
  recyclingKey,
  testID,
}) => {
  const tw = useTailwind();
  const foxicon = parseFoxiconAvatarUrl(imageUrl);
  const avatarSeed = resolveTraderAvatarSeed(address, profileId);

  if (foxicon) {
    return (
      <ProfileAvatar
        avatarPresetId={foxicon.avatarPresetId}
        avatarBackgroundId={foxicon.avatarBackgroundId}
        diameter={size}
        testID={testID}
      />
    );
  }

  if (hasRealAvatar(imageUrl) && !isFoxiconAvatarUrl(imageUrl)) {
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
      address={avatarSeed}
      size={toAvatarAccountSize(size)}
      twClassName={`w-[${size}px] h-[${size}px] rounded-full`}
      maskiconProps={{ size }}
      testID={testID}
    />
  );
};

export default TraderAvatar;

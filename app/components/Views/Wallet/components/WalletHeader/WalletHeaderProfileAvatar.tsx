import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../util/deviceCapability';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ProfileAvatar from '../../../SocialLeaderboard/MyProfileView/components/ProfileAvatar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useMyProfile } from '../../../SocialLeaderboard/MyProfileView/hooks/useMyProfile';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

const HEADER_AVATAR_DIAMETER = 24;

/** Fills the 40px Social homepage profile capsule. */
export const SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER = 40;

interface WalletHeaderProfileAvatarProps {
  /** Diameter in points. Defaults to the compact header avatar. */
  diameter?: number;
}

/**
 * The wallet header's Social V1 avatar: the profile API image, else the saved
 * avatar preset, else a neutral placeholder while no profile exists yet.
 */
const WalletHeaderProfileAvatar = ({
  diameter = HEADER_AVATAR_DIAMETER,
}: WalletHeaderProfileAvatarProps) => {
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  // Offline or low-memory devices stay on the profile already in the
  // controller. A refresh is a network fetch, so those cells skip it.
  // Unknown tiers are not treated as offline or low-memory.
  const canRefreshProfile = networkTier !== 'NONE' && hardwareTier !== 'LOW';
  const { profile } = useMyProfile({ enabled: canRefreshProfile });

  const testID = WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR;
  const placeholderSize =
    diameter >= SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER
      ? AvatarIconSize.Lg
      : AvatarIconSize.Sm;

  if (!profile?.imageUrl && !profile?.avatarPresetId) {
    return (
      <AvatarIcon
        iconName={IconName.UserCircle}
        size={placeholderSize}
        severity={AvatarIconSeverity.Neutral}
        twClassName="bg-transparent"
        testID={testID}
      />
    );
  }

  return (
    <ProfileAvatar
      imageUrl={profile.imageUrl}
      avatarPresetId={profile.avatarPresetId}
      avatarBackgroundId={profile.avatarBackgroundId}
      diameter={diameter}
      testID={testID}
    />
  );
};

export default WalletHeaderProfileAvatar;

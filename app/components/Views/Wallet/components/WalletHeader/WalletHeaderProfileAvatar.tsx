import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  IconName,
} from '@metamask/design-system-react-native';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ProfileAvatar from '../../../SocialLeaderboard/MyProfileView/components/ProfileAvatar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useMyProfile } from '../../../SocialLeaderboard/MyProfileView/hooks/useMyProfile';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
const HEADER_AVATAR_DIAMETER = 24;

/**
 * The wallet header's Social V1 avatar: the profile API image, else the saved
 * avatar preset, else a neutral placeholder while no profile exists yet.
 */
const WalletHeaderProfileAvatar = () => {
  const { profile } = useMyProfile();

  const testID = WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR;

  if (!profile?.imageUrl && !profile?.avatarPresetId) {
    return (
      <AvatarIcon
        iconName={IconName.UserCircle}
        size={AvatarIconSize.Sm}
        severity={AvatarIconSeverity.Neutral}
        testID={testID}
      />
    );
  }

  return (
    <ProfileAvatar
      imageUrl={profile.imageUrl}
      avatarPresetId={profile.avatarPresetId}
      avatarBackgroundId={profile.avatarBackgroundId}
      diameter={HEADER_AVATAR_DIAMETER}
      testID={testID}
    />
  );
};

export default WalletHeaderProfileAvatar;

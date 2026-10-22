import type { Profile, XProfile } from '@metamask/profile-controller';
import { getLinkedEvmAddress } from '../../../../../selectors/profileController';
import { parseFoxiconAvatarUrl } from '../avatarPresets';
import type { MySocialProfile } from '../hooks/useMyProfile';
import { profileUrlForHandle } from '../../ProfileOnboarding/profileOnboardingDraft';

/**
 * Older local profiles stored the preset beside the controller profile.
 * A foxicon avatar URL already carries the preset, so that one wins.
 */
export const withLocalAvatarPreset = (
  controllerProfile: MySocialProfile,
  localProfile: MySocialProfile | null,
): MySocialProfile => {
  if (
    controllerProfile.avatarPresetId ||
    !localProfile?.avatarPresetId ||
    controllerProfile.imageUrl ||
    localProfile.handle !== controllerProfile.handle
  ) {
    return controllerProfile;
  }

  return {
    ...controllerProfile,
    avatarPresetId: localProfile.avatarPresetId,
    avatarBackgroundId: localProfile.avatarBackgroundId ?? null,
    linkedAccountId: localProfile.linkedAccountId ?? null,
  };
};

export const profileControllerToMySocialProfile = (
  profile: Profile,
  xProfile?: XProfile,
): MySocialProfile => {
  const foxicon = parseFoxiconAvatarUrl(profile.avatarUrl);

  return {
    profileId: profile.profileId,
    displayName: profile.displayName,
    handle: profile.username,
    bio: profile.bio || null,
    imageUrl: foxicon ? null : profile.avatarUrl || null,
    avatarPresetId: foxicon?.avatarPresetId ?? null,
    avatarBackgroundId: foxicon?.avatarBackgroundId ?? null,
    rankingTag: null,
    xHandle: profile.connectedToX ? (xProfile?.username ?? null) : null,
    connectedToX: profile.connectedToX,
    followerCount: null,
    followingCount: null,
    shareUrl: profileUrlForHandle(profile.username),
    winRatePercent: null,
    pnlUsd: null,
    linkedAccountAddress: getLinkedEvmAddress(profile.linkedAddresses),
    shareTradingActivity: profile.tradingPrivacy === 'public',
    joinedAt: profile.createdAt || null,
  };
};

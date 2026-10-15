import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import type { Profile, XProfile } from '@metamask/profile-controller';
import type { MySocialProfile } from '../hooks/useMyProfile';
import { profileUrlForHandle } from '../../ProfileOnboarding/profileOnboardingDraft';

const getLinkedEvmAddress = (
  linkedAddresses: CaipAccountId[],
): string | null => {
  for (const linkedAddress of linkedAddresses) {
    try {
      const { address, chainId } = parseCaipAccountId(linkedAddress);
      if (chainId.startsWith('eip155:')) {
        return address;
      }
    } catch {
      // Ignore unsupported linked account formats.
    }
  }

  return null;
};

export const profileControllerToMySocialProfile = (
  profile: Profile,
  xProfile?: XProfile,
): MySocialProfile => ({
  profileId: profile.profileId,
  displayName: profile.displayName,
  handle: profile.username,
  bio: profile.bio || null,
  imageUrl: profile.avatarUrl || null,
  avatarPresetId: null,
  rankingTag: null,
  xHandle: profile.connectedToX ? (xProfile?.username ?? null) : null,
  followerCount: null,
  followingCount: null,
  shareUrl: profileUrlForHandle(profile.username),
  winRatePercent: null,
  pnlUsd: null,
  timesCopied: null,
  linkedAccountAddress: getLinkedEvmAddress(profile.linkedAddresses),
  shareTradingActivity: profile.tradingPrivacy === 'public',
});

import type { CreateProfileParams } from '@metamask/profile-controller';
import type { CaipAccountId } from '@metamask/utils';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  toFoxiconAvatarUrl,
} from '../MyProfileView/avatarPresets';
import type { MySocialProfile } from '../MyProfileView/hooks/useMyProfile';

/** Used when the signed-in session has no profile id yet. The mock service accepts it. */
export const SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID = 'social-v1-profile';

export type ProfileOnboardingStep =
  | 'intro'
  | 'username'
  | 'avatar'
  | 'account'
  | 'ready';

export interface ProfileOnboardingDraft {
  username: string;
  displayName: string;
  displayNameEdited: boolean;
  avatarPresetId: string;
  avatarBackgroundId: string;
  linkedAccountId: string | null;
  linkedAccountAddress: string | null;
  shareTradingActivity: boolean;
}

export type UsernameStatus = 'empty' | 'invalid' | 'available';

const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;

export const USERNAME_SUGGESTIONS = [
  'wen-cat',
  'moon-fox',
  'signal-shrimp',
  'quiet-otter',
] as const;

export const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@+/, '').toLowerCase();

export const getUsernameStatus = (value: string): UsernameStatus => {
  const username = normalizeUsername(value);
  if (!username) {
    return 'empty';
  }
  if (
    username.length < MIN_USERNAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH ||
    !USERNAME_PATTERN.test(username)
  ) {
    return 'invalid';
  }
  return 'available';
};

export const displayNameFromUsername = (value: string): string =>
  normalizeUsername(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const createInitialOnboardingDraft = (): ProfileOnboardingDraft => {
  const username = USERNAME_SUGGESTIONS[0];
  return {
    username,
    displayName: displayNameFromUsername(username),
    displayNameEdited: false,
    avatarPresetId: DEFAULT_PROFILE_AVATAR_PRESET_ID,
    avatarBackgroundId: DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
    linkedAccountId: null,
    linkedAccountAddress: null,
    shareTradingActivity: true,
  };
};

export const profileUrlForHandle = (handle: string): string =>
  `https://metamask.io/${normalizeUsername(handle)}`;

export const buildCreateProfileParams = (
  draft: ProfileOnboardingDraft,
  profileId: string,
): CreateProfileParams => {
  if (!draft.linkedAccountAddress) {
    throw new Error('Profile onboarding requires a linked account');
  }

  return {
    profile_id: profileId,
    username: normalizeUsername(draft.username),
    display_name: draft.displayName.trim(),
    bio: null,
    linked_addresses: [
      `eip155:1:${draft.linkedAccountAddress}` as CaipAccountId,
    ],
    avatar_url: toFoxiconAvatarUrl(
      draft.avatarPresetId,
      draft.avatarBackgroundId,
    ),
    trading_privacy: draft.shareTradingActivity ? 'public' : 'private',
  };
};

export const buildOnboardedSocialProfile = (
  draft: ProfileOnboardingDraft,
): MySocialProfile => {
  const handle = normalizeUsername(draft.username);
  return {
    profileId: 'current-user',
    displayName: draft.displayName.trim(),
    handle,
    createdAt: new Date().toISOString(),
    bio: null,
    imageUrl: null,
    avatarPresetId: draft.avatarPresetId,
    avatarBackgroundId: draft.avatarBackgroundId,
    rankingTag: null,
    xHandle: null,
    followerCount: 0,
    shareUrl: profileUrlForHandle(handle),
    winRatePercent: null,
    pnlUsd: null,
    timesCopied: null,
    linkedAccountId: draft.linkedAccountId,
    linkedAccountAddress: draft.linkedAccountAddress,
    shareTradingActivity: draft.shareTradingActivity,
  };
};

export const canContinueUsernameStep = (
  draft: ProfileOnboardingDraft,
): boolean =>
  getUsernameStatus(draft.username) === 'available' &&
  draft.displayName.trim().length > 0;

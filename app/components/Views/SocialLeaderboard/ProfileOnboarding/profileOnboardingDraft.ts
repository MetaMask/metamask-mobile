import type { CreateProfileParams } from '@metamask/profile-controller';
import type { CaipAccountId } from '@metamask/utils';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  toFoxiconAvatarUrl,
} from '../MyProfileView/avatarPresets';
import type { MySocialProfile } from '../MyProfileView/hooks/useMyProfile';
import { generateUsername, MAX_USERNAME_LENGTH } from './generateUsername';

/**
 * Stand-in for the X account OAuth would return. Connect is mocked until the
 * authorization redirect works.
 */
export const MOCK_X_ONBOARDING_PROFILE = {
  username: 'degangirl',
  displayName: 'Degan Giri',
  avatarUrl:
    'https://pbs.twimg.com/profile_images/2079082606717779969/DcvmQxfE_400x400.jpg',
} as const;

/** Used when the signed-in session has no profile id yet. The mock service accepts it. */
export const SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID = 'social-v1-profile';

export type ProfileOnboardingPath = 'manual' | 'x';

export type ProfileOnboardingStep =
  | 'intro'
  | 'username'
  | 'x-identity'
  | 'avatar'
  | 'account'
  | 'ready';

export interface ProfileOnboardingDraft {
  path: ProfileOnboardingPath;
  username: string;
  displayName: string;
  displayNameEdited: boolean;
  /** When true, the MetaMask handle is the linked X username. */
  useXUsername: boolean;
  /** When true, the avatar is the linked X profile picture. */
  useXAvatar: boolean;
  xUsername: string | null;
  xDisplayName: string | null;
  xAvatarUrl: string | null;
  avatarPresetId: string;
  avatarBackgroundId: string;
  linkedAccountId: string | null;
  linkedAccountAddress: string | null;
  shareTradingActivity: boolean;
}

export type UsernameStatus = 'empty' | 'invalid' | 'available';

const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_USERNAME_LENGTH = 3;

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
  const username = generateUsername();
  return {
    path: 'manual',
    username,
    displayName: displayNameFromUsername(username),
    displayNameEdited: false,
    useXUsername: false,
    useXAvatar: false,
    xUsername: null,
    xDisplayName: null,
    xAvatarUrl: null,
    avatarPresetId: DEFAULT_PROFILE_AVATAR_PRESET_ID,
    avatarBackgroundId: DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
    linkedAccountId: null,
    linkedAccountAddress: null,
    shareTradingActivity: true,
  };
};

export const profileUrlForHandle = (handle: string): string =>
  `https://metamask.io/${normalizeUsername(handle)}`;

/**
 * Manual onboarding after Connect X must not keep the X path. A fresh manual
 * draft keeps the account already chosen for this session.
 */
export const startManualOnboarding = (
  draft: ProfileOnboardingDraft,
): ProfileOnboardingDraft => {
  if (draft.path === 'manual') {
    return draft;
  }

  const initial = createInitialOnboardingDraft();
  return {
    ...initial,
    linkedAccountId: draft.linkedAccountId,
    linkedAccountAddress: draft.linkedAccountAddress,
  };
};

export const applyXOnboardingProfile = (
  draft: ProfileOnboardingDraft,
): ProfileOnboardingDraft => ({
  ...draft,
  path: 'x',
  useXUsername: true,
  useXAvatar: true,
  xUsername: MOCK_X_ONBOARDING_PROFILE.username,
  xDisplayName: MOCK_X_ONBOARDING_PROFILE.displayName,
  xAvatarUrl: MOCK_X_ONBOARDING_PROFILE.avatarUrl,
  username: MOCK_X_ONBOARDING_PROFILE.username,
  displayName: MOCK_X_ONBOARDING_PROFILE.displayName,
  displayNameEdited: true,
});

const avatarUrlForDraft = (draft: ProfileOnboardingDraft): string => {
  if (draft.useXAvatar && draft.xAvatarUrl) {
    return draft.xAvatarUrl;
  }

  return toFoxiconAvatarUrl(draft.avatarPresetId, draft.avatarBackgroundId);
};

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
    avatar_url: avatarUrlForDraft(draft),
    trading_privacy: draft.shareTradingActivity ? 'public' : 'private',
  };
};

export const buildOnboardedSocialProfile = (
  draft: ProfileOnboardingDraft,
): MySocialProfile => {
  const handle = normalizeUsername(draft.username);
  const usesXAvatar = draft.useXAvatar && Boolean(draft.xAvatarUrl);
  return {
    profileId: 'current-user',
    displayName: draft.displayName.trim(),
    handle,
    bio: null,
    imageUrl: usesXAvatar ? draft.xAvatarUrl : null,
    avatarPresetId: usesXAvatar ? null : draft.avatarPresetId,
    avatarBackgroundId: usesXAvatar ? null : draft.avatarBackgroundId,
    rankingTag: null,
    xHandle: draft.path === 'x' ? draft.xUsername : null,
    connectedToX: draft.path === 'x',
    followerCount: 0,
    shareUrl: profileUrlForHandle(handle),
    winRatePercent: null,
    pnlUsd: null,
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

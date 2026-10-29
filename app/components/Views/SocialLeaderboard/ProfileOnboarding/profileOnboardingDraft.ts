import type { CreateProfileParams } from '@metamask/profile-controller';
import type { CaipAccountId } from '@metamask/utils';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  toFoxiconAvatarUrl,
} from '../MyProfileView/avatarPresets';
import type { MySocialProfile } from '../MyProfileView/hooks/useMyProfile';
import { generateUsername, MAX_USERNAME_LENGTH } from './generateUsername';

/** X account returned by ProfileController.connectX during onboarding. */
export interface XOnboardingIdentity {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

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

export type UsernameStatus =
  | 'empty'
  | 'tooShort'
  | 'tooLong'
  | 'invalid'
  | 'available';

/** Server rule: letters, numbers, and underscores; edges allowed. */
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
export const MIN_USERNAME_LENGTH = 3;

export const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@+/, '').toLowerCase();

export const getUsernameStatus = (value: string): UsernameStatus => {
  const username = normalizeUsername(value);
  if (!username) {
    return 'empty';
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return 'tooShort';
  }
  // Length outranks the pattern, so a long handle still hears about its length.
  if (username.length > MAX_USERNAME_LENGTH) {
    return 'tooLong';
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'invalid';
  }
  return 'available';
};

export const displayNameFromUsername = (value: string): string =>
  normalizeUsername(value)
    .split('_')
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
  identity: XOnboardingIdentity,
): ProfileOnboardingDraft => {
  const username = normalizeUsername(identity.username);
  const avatarUrl = identity.avatarUrl || null;
  return {
    ...draft,
    path: 'x',
    useXUsername: true,
    useXAvatar: Boolean(avatarUrl),
    xUsername: username,
    xDisplayName: identity.displayName,
    xAvatarUrl: avatarUrl,
    username,
    displayName:
      identity.displayName.trim() || displayNameFromUsername(username),
    displayNameEdited: true,
  };
};

const avatarUrlForDraft = (draft: ProfileOnboardingDraft): string => {
  if (draft.useXAvatar && draft.xAvatarUrl) {
    return draft.xAvatarUrl;
  }

  return toFoxiconAvatarUrl(draft.avatarPresetId, draft.avatarBackgroundId);
};

/**
 * `linkedAddresses` is every address in the chosen account group (EVM,
 * Solana, ...). Without it, only the draft's EVM address is linked.
 */
export const buildCreateProfileParams = (
  draft: ProfileOnboardingDraft,
  profileId: string,
  linkedAddresses?: CaipAccountId[],
): CreateProfileParams => {
  if (!draft.linkedAccountAddress) {
    throw new Error('Profile onboarding requires a linked account');
  }

  return {
    profile_id: profileId,
    username: normalizeUsername(draft.username),
    display_name: draft.displayName.trim(),
    bio: null,
    linked_addresses: linkedAddresses?.length
      ? linkedAddresses
      : [`eip155:1:${draft.linkedAccountAddress}` as CaipAccountId],
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
    winRatePercent: null,
    pnlUsd: null,
    linkedAccountId: draft.linkedAccountId,
    linkedAccountAddress: draft.linkedAccountAddress,
    shareTradingActivity: draft.shareTradingActivity,
  };
};

/**
 * The handle copied from X, still selected. Pattern checks wait until the
 * user turns that off and edits the handle.
 */
export const isUneditedXUsername = (draft: ProfileOnboardingDraft): boolean =>
  draft.useXUsername &&
  Boolean(draft.xUsername) &&
  normalizeUsername(draft.username) ===
    normalizeUsername(draft.xUsername ?? '');

/**
 * Identity of the profile that would be written. `profile_id` is omitted so
 * a session id does not look like an edit.
 */
export const onboardingProfileFingerprint = (
  draft: ProfileOnboardingDraft,
  linkedAddresses?: CaipAccountId[],
): string | null => {
  if (!draft.linkedAccountAddress) {
    return null;
  }

  const params = buildCreateProfileParams(
    draft,
    'fingerprint',
    linkedAddresses,
  );
  return JSON.stringify({
    username: params.username,
    display_name: params.display_name,
    bio: params.bio ?? null,
    linked_addresses: params.linked_addresses,
    avatar_url: params.avatar_url ?? null,
    trading_privacy: params.trading_privacy,
  });
};

export const canContinueUsernameStep = (
  draft: ProfileOnboardingDraft,
): boolean => {
  if (draft.displayName.trim().length === 0) {
    return false;
  }
  if (isUneditedXUsername(draft)) {
    return normalizeUsername(draft.username).length > 0;
  }
  return getUsernameStatus(draft.username) === 'available';
};

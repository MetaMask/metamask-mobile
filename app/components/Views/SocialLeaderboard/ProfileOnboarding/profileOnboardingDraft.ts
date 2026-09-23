import { DEFAULT_PROFILE_AVATAR_PRESET_ID } from '../MyProfileView/avatarPresets';
import type { MySocialProfile } from '../MyProfileView/hooks/useMyProfile';

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
  avatarGridIndex: number;
  linkedAccountId: string | null;
  linkedAccountAddress: string | null;
  shareTradingActivity: boolean;
}

export type UsernameStatus = 'empty' | 'invalid' | 'available';

const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;

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

export const nextUsernameSuggestion = (current: string): string => {
  const normalized = normalizeUsername(current);
  const index = USERNAME_SUGGESTIONS.indexOf(
    normalized as (typeof USERNAME_SUGGESTIONS)[number],
  );
  const nextIndex =
    index === -1 ? 0 : (index + 1) % USERNAME_SUGGESTIONS.length;
  return USERNAME_SUGGESTIONS[nextIndex];
};

export const createInitialOnboardingDraft = (): ProfileOnboardingDraft => {
  const username = USERNAME_SUGGESTIONS[0];
  return {
    username,
    displayName: displayNameFromUsername(username),
    displayNameEdited: false,
    avatarPresetId: DEFAULT_PROFILE_AVATAR_PRESET_ID,
    avatarGridIndex: 0,
    linkedAccountId: null,
    linkedAccountAddress: null,
    shareTradingActivity: true,
  };
};

export const profileUrlForHandle = (handle: string): string =>
  `https://metamask.io/${normalizeUsername(handle)}`;

export const buildOnboardedSocialProfile = (
  draft: ProfileOnboardingDraft,
): MySocialProfile => {
  const handle = normalizeUsername(draft.username);
  return {
    profileId: 'current-user',
    displayName: draft.displayName.trim(),
    handle,
    bio: null,
    imageUrl: null,
    avatarPresetId: draft.avatarPresetId,
    rankingTag: null,
    xHandle: null,
    followerCount: 0,
    shareUrl: profileUrlForHandle(handle),
    winRatePercent: null,
    pnlUsd: null,
    holdTimeLabel: null,
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

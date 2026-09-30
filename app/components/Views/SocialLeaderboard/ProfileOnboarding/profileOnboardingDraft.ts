import type { CreateProfileParams } from '@metamask/profile-controller';
import { KnownCaipNamespace, toCaipAccountId } from '@metamask/utils';
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
  profileId = 'current-user',
): MySocialProfile => {
  const handle = normalizeUsername(draft.username);
  return {
    profileId,
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
    timesCopied: null,
    linkedAccountId: draft.linkedAccountId,
    linkedAccountAddress: draft.linkedAccountAddress,
    shareTradingActivity: draft.shareTradingActivity,
  };
};

export const canContinueUsernameStep = (
  draft: ProfileOnboardingDraft,
  isUsernameAvailable: boolean,
): boolean =>
  isUsernameAvailable &&
  getUsernameStatus(draft.username) === 'available' &&
  draft.displayName.trim().length > 0;

/**
 * Chain-agnostic CAIP-10 id for an EVM address (`eip155:0:<address>`).
 *
 * @param address - The wallet address chosen during onboarding.
 * @returns The CAIP account id stored on the profile.
 */
export const toLinkedCaipAccountId = (address: string) =>
  toCaipAccountId(KnownCaipNamespace.Eip155, '0', address);

/**
 * Create-profile body for the current draft.
 *
 * The preview controller requires `trading_privacy` and `linked_addresses` on
 * create, so the trading-activity switch is sent here. Avatar presets are not
 * URLs and stay off the request.
 *
 * @param draft - Onboarding choices.
 * @param profileId - OIDC session id. The API does not mint this.
 * @returns Parameters for `ProfileController.createProfile`.
 */
export const buildCreateProfileParams = (
  draft: ProfileOnboardingDraft,
  profileId: string,
): CreateProfileParams => ({
  profile_id: profileId,
  username: normalizeUsername(draft.username),
  display_name: draft.displayName.trim(),
  bio: null,
  linked_addresses: draft.linkedAccountAddress
    ? [toLinkedCaipAccountId(draft.linkedAccountAddress)]
    : [],
  trading_privacy: draft.shareTradingActivity ? 'public' : 'private',
});

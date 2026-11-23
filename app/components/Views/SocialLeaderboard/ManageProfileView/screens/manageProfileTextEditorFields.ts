import { MAX_DISPLAY_NAME_LENGTH } from '../../ProfileOnboarding/profileOnboardingDraft';
import type { MySocialProfile } from '../../MyProfileView/hooks/useMyProfile';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';

export const MANAGE_PROFILE_TEXT_EDITOR_FIELDS = [
  'displayName',
  'handle',
  'bio',
  'socials',
] as const;

export type ManageProfileTextEditorField =
  (typeof MANAGE_PROFILE_TEXT_EDITOR_FIELDS)[number];

/**
 * The length the profile API accepts for a bio. It answers an over-long bio
 * with the same 400 as refused content, so the editor caps input here to keep
 * that 400 meaning one thing.
 */
export const MAX_BIO_LENGTH = 160;

interface ManageProfileTextEditorFieldConfig {
  titleKey:
    | 'social_leaderboard.manage_profile.display_name'
    | 'social_leaderboard.manage_profile.handle'
    | 'social_leaderboard.manage_profile.bio'
    | 'social_leaderboard.manage_profile.x_account';
  helperKey?:
    | 'social_leaderboard.manage_profile.handle_helper'
    | 'social_leaderboard.manage_profile.socials_helper';
  prefix?: string;
  multiline?: boolean;
  /** Caps what the user can type. */
  maxLength?: number;
  /** Opens the keyboard on the input as soon as the editor is shown. */
  autoFocus?: boolean;
  getInitialValue: (profile: MySocialProfile | null) => string;
  testIDs: {
    container: string;
    header: string;
    back: string;
    input: string;
    save: string;
  };
}

export const MANAGE_PROFILE_TEXT_EDITOR_FIELD_CONFIG: Record<
  ManageProfileTextEditorField,
  ManageProfileTextEditorFieldConfig
> = {
  displayName: {
    titleKey: 'social_leaderboard.manage_profile.display_name',
    maxLength: MAX_DISPLAY_NAME_LENGTH,
    autoFocus: true,
    getInitialValue: (profile) => profile?.displayName ?? '',
    testIDs: {
      container: ManageProfileEditorSelectorsIDs.DISPLAY_NAME_CONTAINER,
      header: ManageProfileEditorSelectorsIDs.DISPLAY_NAME_HEADER,
      back: ManageProfileEditorSelectorsIDs.DISPLAY_NAME_BACK,
      input: ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT,
      save: ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE,
    },
  },
  handle: {
    titleKey: 'social_leaderboard.manage_profile.handle',
    helperKey: 'social_leaderboard.manage_profile.handle_helper',
    prefix: '@',
    getInitialValue: (profile) => profile?.handle ?? '',
    testIDs: {
      container: ManageProfileEditorSelectorsIDs.HANDLE_CONTAINER,
      header: ManageProfileEditorSelectorsIDs.HANDLE_HEADER,
      back: ManageProfileEditorSelectorsIDs.HANDLE_BACK,
      input: ManageProfileEditorSelectorsIDs.HANDLE_INPUT,
      save: ManageProfileEditorSelectorsIDs.HANDLE_SAVE,
    },
  },
  bio: {
    titleKey: 'social_leaderboard.manage_profile.bio',
    multiline: true,
    maxLength: MAX_BIO_LENGTH,
    autoFocus: true,
    getInitialValue: (profile) => profile?.bio ?? '',
    testIDs: {
      container: ManageProfileEditorSelectorsIDs.BIO_CONTAINER,
      header: ManageProfileEditorSelectorsIDs.BIO_HEADER,
      back: ManageProfileEditorSelectorsIDs.BIO_BACK,
      input: ManageProfileEditorSelectorsIDs.BIO_INPUT,
      save: ManageProfileEditorSelectorsIDs.BIO_SAVE,
    },
  },
  socials: {
    titleKey: 'social_leaderboard.manage_profile.x_account',
    helperKey: 'social_leaderboard.manage_profile.socials_helper',
    prefix: '@',
    getInitialValue: (profile) => profile?.xHandle ?? '',
    testIDs: {
      container: ManageProfileEditorSelectorsIDs.SOCIALS_CONTAINER,
      header: ManageProfileEditorSelectorsIDs.SOCIALS_HEADER,
      back: ManageProfileEditorSelectorsIDs.SOCIALS_BACK,
      input: ManageProfileEditorSelectorsIDs.SOCIALS_INPUT,
      save: ManageProfileEditorSelectorsIDs.SOCIALS_SAVE,
    },
  },
};

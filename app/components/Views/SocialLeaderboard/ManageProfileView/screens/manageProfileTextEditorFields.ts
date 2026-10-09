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

interface ManageProfileTextEditorFieldConfig {
  titleKey:
    | 'social_leaderboard.manage_profile.display_name'
    | 'social_leaderboard.manage_profile.handle'
    | 'social_leaderboard.manage_profile.bio'
    | 'social_leaderboard.manage_profile.socials';
  helperKey?:
    | 'social_leaderboard.manage_profile.handle_helper'
    | 'social_leaderboard.manage_profile.socials_helper';
  prefix?: string;
  multiline?: boolean;
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
    titleKey: 'social_leaderboard.manage_profile.socials',
    helperKey: 'social_leaderboard.manage_profile.socials_helper',
    prefix: 'X @',
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

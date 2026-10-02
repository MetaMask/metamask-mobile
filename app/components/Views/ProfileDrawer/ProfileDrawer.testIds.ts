/**
 * Selectors (testIDs) for the Profile Drawer screen and its children.
 * Colocated per the sibling-screen convention (e.g. AccountSelector,
 * SocialPostComposerView).
 */
export const ProfileDrawerViewSelectorsIDs = {
  CONTAINER: 'profile-drawer-container',
  HEADER: 'profile-drawer-header',
  CLOSE_BUTTON: 'profile-drawer-close-button',
  SCAN_BUTTON: 'profile-drawer-scan-button',
  PROFILE_PLACEHOLDER: 'profile-drawer-profile-placeholder',
  ROW_ACCOUNT_SELECTOR: 'profile-drawer-row-account-selector',
  ROW_NOTIFICATIONS: 'profile-drawer-row-notifications',
  ROW_SUBSCRIPTIONS: 'profile-drawer-row-subscriptions',
  ROW_SETTINGS: 'profile-drawer-row-settings',
  ROW_HELP_AND_SUPPORT: 'profile-drawer-row-help-and-support',
} as const;

export const ProfileCreateViewSelectorsIDs = {
  CONTAINER: 'profile-drawer-profile-create-container',
  CLOSE_BUTTON: 'profile-drawer-profile-create-close-button',
  EMPTY_STATE: 'profile-drawer-profile-create-empty-state',
  STEPPER: 'profile-drawer-profile-create-stepper',
} as const;

import enContent from '../../../../locales/languages/en.json';

export const SecurityPrivacyViewSelectorsIDs = {
  SECURITY_SETTINGS_SCROLL: 'security-settings-scrollview',
  REVEAL_SEED_BUTTON: 'reveal-seed-button',
  CHANGE_PASSWORD_CONTAINER: 'change-password-section',
  CHANGE_PASSWORD_BUTTON: 'change-password-button',
  METAMETRICS_SWITCH: 'metametrics-switch',
  DATA_COLLECTION_SWITCH: 'data-collection-switch',
  AUTO_LOCK_SECTION: 'auto-lock-section',
  REMEMBER_ME_TOGGLE: 'turn-on-remember-me',
  SHOW_PRIVATE_KEY: 'show-private-key',
  BIOMETRICS_TOGGLE: 'biometrics-option',
  DEVICE_PASSCODE_TOGGLE: 'DevicePasscodeOption',
  INCOMING_TRANSACTIONS: 'incoming-transactions-section',
};

export const SecurityPrivacyViewSelectorsText = {
  SECURITY_AND_PRIVACY_HEADING: enContent.app_settings.security_title,
  BACK_UP_NOW: enContent.app_settings.back_up_now,
  PRIVACY_HEADING: enContent.app_settings.privacy_heading,
  CLEAR_BROWSER_COOKIES: enContent.app_settings.clear_browser_cookies_desc,
  AUTO_LOCK_30_SECONDS: enContent.app_settings.autolock_after.replace(
    '{{time}}',
    '30',
  ),
};

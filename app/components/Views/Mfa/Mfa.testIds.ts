export const MfaFlowSelectorsIDs = {
  CONTAINER: 'mfa-flow',
  BACK_BUTTON: 'mfa-flow-back-button',
  CLOSE_BUTTON: 'mfa-flow-close-button',
  PRIMARY_BUTTON: 'mfa-flow-primary-button',
  SECONDARY_BUTTON: 'mfa-flow-secondary-button',
  ERROR: 'mfa-flow-error',
  EMAIL_INPUT: 'mfa-flow-email-input',
  CODE_INPUT: 'mfa-flow-code-input',
  CODE_TAP_AREA: 'mfa-flow-code-tap-area',
  RESEND_BUTTON: 'mfa-flow-resend-button',
  PASTE_BUTTON: 'mfa-flow-paste-button',
  PICKER_OPTION: 'mfa-flow-picker-option',
  INTRO_METHOD: 'mfa-flow-intro-method',
  TOTP_OPEN_APP: 'mfa-flow-totp-open-app',
  TOTP_COPY_KEY: 'mfa-flow-totp-copy-key',
  TOTP_SETUP_KEY: 'mfa-flow-totp-setup-key',
  TOTP_OTHER_DEVICE: 'mfa-flow-totp-other-device',
  TOTP_QR_SHEET: 'mfa-flow-totp-qr-sheet',
  TOTP_QR_IMAGE: 'mfa-flow-totp-qr-image',
  TOTP_QR_CONTINUE: 'mfa-flow-totp-qr-continue',
} as const;

export const MfaSettingsSelectorsIDs = {
  CONTAINER: 'mfa-settings',
  EMAIL_ROW: 'mfa-settings-email-row',
  PASSKEY_ROW: 'mfa-settings-passkey-row',
  TOTP_ROW: 'mfa-settings-totp-row',
  QA_PRESETS: 'mfa-settings-qa-presets',
  QA_RESULT: 'mfa-settings-qa-result',
} as const;

export const MfaPasskeysSelectorsIDs = {
  CONTAINER: 'mfa-passkeys',
  ROW: 'mfa-passkeys-row',
  ADD_BUTTON: 'mfa-passkeys-add-button',
} as const;

export const MfaMethodDetailsSelectorsIDs = {
  CONTAINER: 'mfa-method-details',
  REMOVE_BUTTON: 'mfa-method-details-remove-button',
  CONFIRM_SHEET: 'mfa-method-details-confirm-sheet',
  CONFIRM_BUTTON: 'mfa-method-details-confirm-button',
  LAST_METHOD_SHEET: 'mfa-method-details-last-method-sheet',
} as const;

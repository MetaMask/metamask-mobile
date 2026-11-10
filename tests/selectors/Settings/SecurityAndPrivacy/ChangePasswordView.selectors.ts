import enContent from '../../../../locales/languages/en.json';

export const ChangePasswordViewSelectorsIDs = {
  /** Unique ResetPassword body — not present on Security & Privacy list. */
  SCREEN_ID: 'account-backup-step-4-screen',
};

export const ChangePasswordViewSelectorsText = {
  CHANGE_PASSWORD: enContent.password_reset.change_password,
  ENTER_CURRENT_PASSWORD: enContent.manual_backup_step_1.enter_current_password,
  CONFIRM_CURRENT_PASSWORD: enContent.manual_backup_step_1.confirm,
  SAVE_PASSWORD: enContent.reset_password.confirm_btn,
  /** Seedless Save opens SuccessErrorSheet with this title before applying. */
  WARNING_PASSWORD_CHANGE_TITLE:
    enContent.reset_password.warning_password_change_title,
  CONFIRM_PASSWORD_CHANGE:
    enContent.reset_password.warning_password_change_button,
  PASSWORD_UPDATED_TOAST: enContent.reset_password.password_updated,
};

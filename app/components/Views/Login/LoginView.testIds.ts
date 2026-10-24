import enContent from '../../../../locales/languages/en.json';

export const LoginViewSelectors = {
  CONTAINER: 'login',
  PASSWORD_ERROR: 'invalid-password-error',
  RESET_WALLET: 'reset-wallet-button',
  LOGIN_BUTTON_ID: 'log-in-button',
  TITLE_ID: 'login-title',
  REMEMBER_ME_SWITCH: 'login-with-remember-me-switch',
  BIOMETRIC_SWITCH: 'login-with-biometric-switch',
  PASSWORD_INPUT: 'login-password-input',
  DEVICE_AUTHENTICATION_ICON: 'device-authentication-icon',
  OTHER_METHODS_BUTTON: 'other-methods-button',
  /** Long-press target for downloading state logs (dev diagnostics). */
  DOWNLOAD_LOGS_BUTTON: 'login-download-logs-button',
  /** Dev-only aggregate3 codec benchmark. Temporary PoC for core#11010. */
  AGGREGATE3_BENCHMARK_BUTTON: 'aggregate3-codec-benchmark-button',
  AGGREGATE3_BENCHMARK_RESULT: 'aggregate3-codec-benchmark-result',
};

export const LoginViewSelectorText = {
  UNLOCK_BUTTON: enContent.login.unlock_button,
};

export interface ChoosePasswordRouteParams {
  isFromLogin?: boolean;
  oauthLoginSuccess?: boolean;
  provider?: string;
  previous_screen?: string;
  /**
   * Forgot-password / MFA recovery: create a new password via passwordless
   * social recovery (AAL2 already held), instead of new-wallet creation.
   */
  passwordlessSocialRecovery?: boolean;
}

export interface BiometryType {
  availableBiometryType: string | null;
  currentAuthType: string;
}

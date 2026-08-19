export interface ChoosePasswordRouteParams {
  isFromLogin?: boolean;
  oauthLoginSuccess?: boolean;
  provider?: string;
  previous_screen?: string;
}

export interface BiometryType {
  availableBiometryType: string | null;
  currentAuthType: string;
}

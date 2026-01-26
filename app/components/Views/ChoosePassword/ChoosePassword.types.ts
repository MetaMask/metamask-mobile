import type { TraceContext } from '../../../util/trace';

export interface ChoosePasswordRouteParams {
  isFromLogin?: boolean;
  oauthLoginSuccess?: boolean;
  onboardingTraceCtx?: TraceContext;
  provider?: string;
  previous_screen?: string;
}

export interface BiometryType {
  availableBiometryType: string | null;
  currentAuthType: string;
}

import type { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';

export interface OptinMetricsRouteParams {
  onContinue?: () => void;
  accountType?: string;
  successFlow?: ONBOARDING_SUCCESS_FLOW;
}

export interface LinkParams {
  url: string;
  title: string;
}

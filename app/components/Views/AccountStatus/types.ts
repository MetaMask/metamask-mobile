import { TraceContext } from '../../../util/trace';

/**
 * Account status route parameters
 */
export interface AccountStatusParams {
  accountName?: string;
  oauthLoginSuccess?: boolean;
  onboardingTraceCtx?: TraceContext;
  provider?: string;
  type?: 'found' | 'not_exist';
}

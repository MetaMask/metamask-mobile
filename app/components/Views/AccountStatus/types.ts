export interface AccountStatusParams {
  accountName: string;
  oauthLoginSuccess: boolean;
  onboardingTraceCtx: string;
  type?: 'found' | 'not_exist';
}

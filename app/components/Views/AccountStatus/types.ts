/**
 * Account status route parameters
 */
export interface AccountStatusParams {
  accountName?: string;
  oauthLoginSuccess?: boolean;
  provider?: string;
  type?: 'found' | 'not_exist';
}

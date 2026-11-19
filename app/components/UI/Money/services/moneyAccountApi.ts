import { ApiEnv, getApiEnv } from '../../../../core/apiEnv';

const MONEY_ACCOUNT_API_URL_BY_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://money.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://money.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://money.api.cx.metamask.io',
};

export const getMoneyAccountApiBaseUrl = (): string =>
  MONEY_ACCOUNT_API_URL_BY_ENV[getApiEnv()];

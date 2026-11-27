import { ApiEnv, getApiEnv } from '../../../../core/apiEnv';

const MONEY_ACCOUNT_API_URL_BY_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://money.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://money.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://money.api.cx.metamask.io',
};

interface FetchMoneyAccountApiOptions {
  includeStatus?: boolean;
}

export const getMoneyAccountApiBaseUrl = (): string =>
  MONEY_ACCOUNT_API_URL_BY_ENV[getApiEnv()];

export const fetchMoneyAccountApi = async <TResponse>(
  path: string,
  searchParams: Record<string, string | number>,
  requestName: string,
  { includeStatus = false }: FetchMoneyAccountApiOptions = {},
): Promise<TResponse> => {
  const url = new URL(path, getMoneyAccountApiBaseUrl());
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = new Error(
      `Money Account API ${requestName} request failed with status '${response.status}'`,
    );
    throw includeStatus
      ? Object.assign(error, { status: response.status })
      : error;
  }

  return (await response.json()) as TResponse;
};

import type { CompletedRequest, Mockttp } from 'mockttp';
import {
  ACCOUNTS_API_V5_TRANSACTIONS_RESPONSE,
  ACCOUNTS_API_V5_TRANSACTIONS_URL,
} from '../defaults/accounts';

const v4TransactionsPath =
  /^https:\/\/accounts\.api\.cx\.metamask\.io\/v4\/multi-account\/transactions(\?.*)?$/;

function proxiedUrl(requestUrl: string) {
  try {
    return new URL(requestUrl).searchParams.get('url') || '';
  } catch {
    return '';
  }
}

function isAccountsTransactionsUrl(url: string) {
  return (
    url.includes('accounts.api.cx.metamask.io') &&
    (url.includes('multi-account/transactions') ||
      url.includes('multiaccount/transactions') ||
      url.includes('transactions'))
  );
}

function v5TransactionsResponse() {
  return { statusCode: 200, json: ACCOUNTS_API_V5_TRANSACTIONS_RESPONSE };
}

function transactionsResponse(
  request: CompletedRequest,
  v4Handler: () => { statusCode: number; json: object },
) {
  const target = proxiedUrl(request.url) || request.url;
  if (target.includes('/v5/')) {
    return v5TransactionsResponse();
  }
  return v4Handler();
}

export async function mockAccountsApiTransactionRoutes(
  mockServer: Mockttp,
  v4Handler: () => { statusCode: number; json: object },
) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => isAccountsTransactionsUrl(proxiedUrl(request.url)))
    .thenCallback((request) => transactionsResponse(request, v4Handler));

  await mockServer
    .forGet(v4TransactionsPath)
    .asPriority(1001)
    .thenCallback(v4Handler);

  await mockServer
    .forGet(ACCOUNTS_API_V5_TRANSACTIONS_URL)
    .asPriority(1001)
    .thenCallback(v5TransactionsResponse);
}

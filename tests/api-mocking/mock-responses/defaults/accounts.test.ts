import {
  ACCOUNTS_API_V5_TRANSACTIONS_RESPONSE,
  DEFAULT_ACCOUNTS_MOCK,
} from './accounts.ts';

const V5_TRANSACTIONS_URL =
  'https://accounts.api.cx.metamask.io/v5/multiaccount/transactions?accountIds=eip155%3A0%3A0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3&networks=eip155%3A1%2Ceip155%3A137&includeTxMetadata=true';

describe('DEFAULT_ACCOUNTS_MOCK', () => {
  it('answers Accounts API v5 transaction history with an empty page', () => {
    const mock = DEFAULT_ACCOUNTS_MOCK.GET?.find(
      (endpoint) =>
        endpoint.urlEndpoint instanceof RegExp &&
        endpoint.urlEndpoint.test(V5_TRANSACTIONS_URL),
    );

    expect(mock?.responseCode).toBe(200);
    expect(mock?.response).toEqual(ACCOUNTS_API_V5_TRANSACTIONS_RESPONSE);
    expect(ACCOUNTS_API_V5_TRANSACTIONS_RESPONSE).toEqual({
      data: [],
      pageInfo: { count: 0, hasNextPage: false },
      unprocessedAccounts: [],
    });
  });
});

/**
 * Accounts API v6 balances stub for the Tokens I own import list.
 * The view test spies on the API client instead of nock: this Jest setup
 * delivers the same request through both fetch and XHR, and nock then throws
 * "request has already been handled" on the second delivery.
 */

import { apiClient } from '../../../app/core/apiClient';

export const OWNED_TOKENS_ACCOUNT_ID =
  'eip155:1:0x0000000000000000000000000000000000000001';

export const HIDDEN_OWNED_ASSET_ID =
  'eip155:1/erc20:0x00000000000000000000000000000000000000aa';
export const UNDETECTED_OWNED_ASSET_ID =
  'eip155:1/erc20:0x00000000000000000000000000000000000000bb';
export const WARNING_OWNED_ASSET_ID =
  'eip155:1/erc20:0x00000000000000000000000000000000000000cc';

export interface OwnedTokensBalanceMock {
  assetId: string;
  symbol: string;
  name: string;
  balance?: string;
  price?: string;
  labels?: string[];
}

const balanceRow = (token: OwnedTokensBalanceMock) => ({
  accountId: OWNED_TOKENS_ACCOUNT_ID,
  object: 'token',
  type: 'erc20',
  assetId: token.assetId,
  name: token.name,
  symbol: token.symbol,
  decimals: 18,
  balance: token.balance ?? '2',
  price: token.price ?? '4',
  labels: token.labels,
});

let balancesSpy: jest.SpyInstance | undefined;

export function setupOwnedTokensBalancesMock(
  tokens: OwnedTokensBalanceMock[],
  options?: { statusCode?: number; unprocessedNetworks?: string[] },
): void {
  const statusCode = options?.statusCode ?? 200;
  const body = {
    balances: statusCode === 200 ? tokens.map(balanceRow) : [],
    unprocessedNetworks: options?.unprocessedNetworks ?? [],
    unprocessedIncludeAssetIds: [] as string[],
  };

  if (!balancesSpy) {
    balancesSpy = jest
      .spyOn(apiClient.accounts, 'getV6MultiAccountBalancesQueryOptions')
      .mockImplementation(
        () =>
          ({
            queryKey: ['owned-tokens-view'],
            queryFn: async () => {
              if (statusCode >= 400) {
                throw new Error('Owned token balances failed');
              }
              return body;
            },
          }) as ReturnType<
            typeof apiClient.accounts.getV6MultiAccountBalancesQueryOptions
          >,
      );
    return;
  }

  balancesSpy.mockImplementation(
    () =>
      ({
        queryKey: ['owned-tokens-view'],
        queryFn: async () => {
          if (statusCode >= 400) {
            throw new Error('Owned token balances failed');
          }
          return body;
        },
      }) as ReturnType<
        typeof apiClient.accounts.getV6MultiAccountBalancesQueryOptions
      >,
  );
}

export function clearOwnedTokensBalancesMock(): void {
  balancesSpy?.mockRestore();
  balancesSpy = undefined;
}

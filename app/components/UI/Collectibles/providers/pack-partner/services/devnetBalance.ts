import { apiClient } from '../../../../../../core/apiClient';
import { PACK_PARTNER_ENVIRONMENTS, USDC_DECIMALS } from '../constants';
import { parseUsdcAmount } from '../utils/format';

/** Reads PackPartner's test USDC through the existing Assets API client, in base units. */
export async function readDevnetUsdcBalance(address: string): Promise<string> {
  const { scope, usdcMint } = PACK_PARTNER_ENVIRONMENTS.devnet;
  const accountId = `${scope}:${address}` as const;
  const { balances, unprocessedNetworks } =
    await apiClient.accounts.fetchV6MultiAccountBalances(
      [accountId],
      {
        networks: [scope],
        filterSupportedTokens: false,
        includeDeFiBalances: false,
        includePrices: false,
      },
      { staleTime: 0, gcTime: 0, bypassServerCache: true },
    );

  if (
    unprocessedNetworks.length > 0 ||
    balances.some((item) => item.accountId !== accountId)
  ) {
    throw new Error('PackPartner Devnet balance unavailable');
  }

  // Observed on 2026-11-12: Accounts API v6 reads Devnet but labels its assetIds
  // with the Mainnet prefix. Devnet is also absent from /v2/supportedNetworks,
  // so AssetsController cannot route this read. Only this Devnet helper accepts
  // either prefix, after checking the requested Devnet account and exact mint.
  // Do not write these mislabeled assets into AssetsController's shared state.
  const mintReference = `/token:${usdcMint}`;
  const balance = balances.find(
    (item) =>
      item.object === 'token' &&
      (item.assetId === `${scope}${mintReference}` ||
        item.assetId ===
          `${PACK_PARTNER_ENVIRONMENTS.mainnet.scope}${mintReference}`),
  );
  if (!balance) {
    return '0';
  }
  if (
    balance.decimals !== USDC_DECIMALS ||
    typeof balance.balance !== 'string' ||
    !/^\d+(?:\.\d{1,6})?$/u.test(balance.balance)
  ) {
    throw new Error('Malformed PackPartner Devnet USDC balance');
  }
  return parseUsdcAmount(balance.balance).toString();
}

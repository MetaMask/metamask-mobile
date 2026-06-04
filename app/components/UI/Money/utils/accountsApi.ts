import type { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { areAddressesEqual } from '../../../../util/address';
import type { CardTransaction } from '../types/moneyActivity';

/**
 * Minimal typed client for the MetaMask Accounts API transactions endpoint.
 *
 * `@metamask/transaction-controller` ships an equivalent `getAccountTransactions`
 * helper but only re-exports `getAccountAddressRelationship` from its public
 * index, so we call the REST endpoint directly here. We model only the response
 * fields Money activity consumes.
 *
 * NOTE: the base URL is hard-coded to match the transaction-controller's own
 * client. Production should prefer the card feature flag's `accountsApiUrl`
 * (the same value `CardController` already reads) so it can be pointed at
 * staging — left out of this example for brevity.
 */
const ACCOUNTS_API_BASE_URL = 'https://accounts.api.cx.metamask.io';
const CLIENT_HEADER = 'x-metamask-clientproduct';
const CLIENT_ID = 'metamask-mobile-money';

/** The Accounts API's own classification for a MetaMask Card spend. */
export const METAMASK_CARD_PAYMENT_TYPE = 'METAMASK_CARD_PAYMENT';

interface AccountsApiValueTransfer {
  contractAddress: string;
  symbol: string;
  decimal: number;
  from: string;
  to: string;
  amount: string;
}

interface AccountsApiTransaction {
  hash: string;
  /** ISO-8601, e.g. "2026-06-04T11:53:51.000Z". */
  timestamp: string;
  chainId: number;
  from: string;
  to: string;
  isError: boolean;
  /** API-assigned category, e.g. "METAMASK_CARD_PAYMENT". */
  transactionType?: string;
  valueTransfers?: AccountsApiValueTransfer[];
}

interface AccountsApiTransactionsResponse {
  data?: AccountsApiTransaction[];
  pageInfo?: { count: number; hasNextPage: boolean; cursor?: string };
}

/**
 * Fetch raw account transactions for `address` on the given `chainIds`.
 *
 * MVP intentionally does not paginate: it requests the most recent page only.
 * `pageInfo.cursor` is available on the wire if that ever changes.
 */
export async function fetchAccountTransactions(args: {
  address: string;
  chainIds: Hex[];
  sortDirection?: 'ASC' | 'DESC';
}): Promise<AccountsApiTransactionsResponse> {
  const { address, chainIds, sortDirection = 'DESC' } = args;
  const params = new URLSearchParams({
    networks: chainIds.join(','),
    sortDirection,
  });
  const url = `${ACCOUNTS_API_BASE_URL}/v1/accounts/${address}/transactions?${params}`;

  const response = await fetch(url, {
    headers: { [CLIENT_HEADER]: CLIENT_ID },
  });
  if (!response.ok) {
    throw new Error(`Accounts API responded ${response.status}`);
  }
  return response.json();
}

/**
 * The settlement leg of a card payment is the value transfer leaving the money
 * account. Falls back to the first transfer if (unexpectedly) none match.
 */
function settlementTransfer(
  tx: AccountsApiTransaction,
  moneyAddress: string,
): AccountsApiValueTransfer | undefined {
  const transfers = tx.valueTransfers ?? [];
  return (
    transfers.find((vt) => areAddressesEqual(vt.from, moneyAddress)) ??
    transfers[0]
  );
}

/**
 * Parse a raw Accounts API response into typed {@link CardTransaction}s —
 * parsing at the boundary so nothing downstream touches the wire shape.
 *
 * Keeps only rows the API itself classifies as card payments
 * ({@link METAMASK_CARD_PAYMENT_TYPE}); no address heuristic. Malformed rows
 * (missing hash / transfer) are dropped rather than throwing.
 */
export function parseCardTransactions(
  response: AccountsApiTransactionsResponse,
  moneyAddress: string,
): CardTransaction[] {
  return (response.data ?? [])
    .filter((tx) => tx.transactionType === METAMASK_CARD_PAYMENT_TYPE)
    .flatMap((tx): CardTransaction[] => {
      const transfer = settlementTransfer(tx, moneyAddress);
      const time = new Date(tx.timestamp).getTime();
      if (!tx.hash || !transfer || Number.isNaN(time)) {
        return [];
      }
      return [
        {
          hash: tx.hash as Hex,
          time,
          chainId: toHex(tx.chainId),
          token: {
            address: transfer.contractAddress as Hex,
            symbol: transfer.symbol,
            decimals: transfer.decimal,
          },
          amount: transfer.amount,
          to: transfer.to as Hex,
        },
      ];
    });
}

import type { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { areAddressesEqual } from '../../../../util/address';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import type { CardTransaction } from '../types/moneyActivity';

/**
 * Minimal typed client for the MetaMask Accounts API transactions endpoint.
 *
 * `@metamask/transaction-controller` ships an equivalent `getAccountTransactions`
 * helper but only re-exports `getAccountAddressRelationship` from its public
 * index, so we call the REST endpoint directly here. We model only the response
 * fields Money activity consumes.
 *
 * The base URL is supplied by the caller (the hook reads the card feature
 * flag's `accountsApiUrl` — the same value `CardController` uses — so it can be
 * pointed at staging). {@link DEFAULT_ACCOUNTS_API_BASE_URL} is only a fallback
 * for when the flag doesn't carry one.
 */
const DEFAULT_ACCOUNTS_API_BASE_URL = 'https://accounts.api.cx.metamask.io';
const CLIENT_HEADER = 'x-metamask-clientproduct';
const CLIENT_ID = 'metamask-mobile-money';

/**
 * Abort the request after this long. React Native's `fetch` has no default
 * timeout, so without this an unresponsive endpoint never settles the promise —
 * which would leave the activity list spinning forever (the caller's
 * `isLoading` only clears once the fetch settles).
 */
const REQUEST_TIMEOUT_MS = 15_000;

/** The Accounts API's own classification for a MetaMask Card spend. */
export const METAMASK_CARD_PAYMENT_TYPE = 'METAMASK_CARD_PAYMENT';

/** Chain IDs we accept card rows from — the API is asked for Monad only, but we
 * don't trust it to honour that, so we re-check on the way in. */
const ALLOWED_CHAIN_IDS = new Set(
  MUSD_MONEY_ACCOUNT_CHAIN_IDS.map((c) => c.toLowerCase()),
);

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
 * Requests the most recent page only; pagination is not implemented.
 * `pageInfo.cursor` is available on the wire if it's needed later.
 */
export async function fetchAccountTransactions(args: {
  address: string;
  chainIds: Hex[];
  /** Accounts API root, e.g. the card feature flag's `accountsApiUrl`. */
  baseUrl?: string;
  sortDirection?: 'ASC' | 'DESC';
  /** Aborts the request when the caller cancels (e.g. the screen blurs). */
  signal?: AbortSignal;
}): Promise<AccountsApiTransactionsResponse> {
  const {
    address,
    chainIds,
    baseUrl = DEFAULT_ACCOUNTS_API_BASE_URL,
    sortDirection = 'DESC',
    signal,
  } = args;
  const params = new URLSearchParams({
    networks: chainIds.join(','),
    sortDirection,
  });
  // Tolerate a trailing slash on the configured base URL.
  const root = baseUrl.replace(/\/+$/u, '');
  const url = `${root}/v1/accounts/${encodeURIComponent(
    address,
  )}/transactions?${params}`;

  // Abort on timeout, and also propagate the caller's cancellation so an
  // in-flight socket is actually torn down (not just its result ignored).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort);
    }
  }

  try {
    const response = await fetch(url, {
      headers: { [CLIENT_HEADER]: CLIENT_ID },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Accounts API responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * The settlement leg of a card payment is the value transfer leaving the money
 * account. Returns `undefined` when no leg leaves the money account — e.g. a
 * refund / chargeback whose funds move *to* the account. We render card rows as
 * outgoing debits, so a leg we can't confirm is outgoing is dropped rather than
 * shown with the wrong sign. (No `transfers[0]` fallback for the same reason.)
 */
function settlementTransfer(
  tx: AccountsApiTransaction,
  moneyAddress: string,
): AccountsApiValueTransfer | undefined {
  return (tx.valueTransfers ?? []).find((vt) =>
    areAddressesEqual(vt.from, moneyAddress),
  );
}

/** A minimal-unit token amount on the wire: a non-empty string of digits. */
const AMOUNT_PATTERN = /^\d+$/u;

/**
 * Convert and validate a wire `chainId`, returning `undefined` unless it's a
 * non-negative integer that maps to a chain we accept card rows from.
 */
function parseChainId(chainId: unknown): Hex | undefined {
  if (
    typeof chainId !== 'number' ||
    !Number.isInteger(chainId) ||
    chainId < 0
  ) {
    return undefined;
  }
  const hex = toHex(chainId);
  return ALLOWED_CHAIN_IDS.has(hex.toLowerCase()) ? hex : undefined;
}

/**
 * Parse a raw Accounts API response into typed {@link CardTransaction}s —
 * parsing at the boundary so nothing downstream touches the wire shape.
 *
 * Keeps only rows the API itself classifies as card payments
 * ({@link METAMASK_CARD_PAYMENT_TYPE}); no address heuristic. Anything we can't
 * trust to render correct money is dropped rather than passed through: a row is
 * kept only when it has a hash, a parseable timestamp, an accepted chain ID, and
 * a settlement leg whose `decimals` is a non-negative integer and whose `amount`
 * is a minimal-unit digit string. (A bad `decimals`/`amount` would otherwise
 * surface as a wildly wrong or `NaN` figure downstream.)
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
      const chainId = parseChainId(tx.chainId);
      if (
        !tx.hash ||
        !transfer ||
        Number.isNaN(time) ||
        !chainId ||
        !Number.isInteger(transfer.decimal) ||
        transfer.decimal < 0 ||
        typeof transfer.amount !== 'string' ||
        !AMOUNT_PATTERN.test(transfer.amount)
      ) {
        return [];
      }
      return [
        {
          hash: tx.hash as Hex,
          time,
          chainId,
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

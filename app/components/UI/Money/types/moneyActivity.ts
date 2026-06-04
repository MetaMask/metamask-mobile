import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

/**
 * A MetaMask Card payment surfaced in Money activity.
 *
 * Card spends settle as an on-chain ERC-20 transfer OUT of the money account
 * (Baanx pulling the delegated funds). They are not composed on this device, so
 * they never reach the local `TransactionController` — they come from the
 * MetaMask Accounts API instead (see {@link fetchAccountTransactions}). The
 * fields here are the public on-chain movement only; vendor / merchant /
 * category data is intentionally absent (out of scope) and reserved for the
 * `enrichment` seam so a future Baanx integration can layer it on without
 * reshaping the union.
 */
export interface CardTransaction {
  /** On-chain tx hash. Stable identity for the activity row. */
  hash: Hex;
  /** Settlement time, epoch ms (parsed from the API's ISO timestamp). */
  time: number;
  chainId: Hex;
  /** The settlement token that left the money account (USDC today, mUSD later). */
  token: {
    address: Hex;
    symbol: string;
    decimals: number;
  };
  /** Raw, minimal-unit amount of the settlement transfer. */
  amount: string;
  /** Future Baanx enrichment (vendor / category). Always absent in the MVP. */
  enrichment?: never;
}

/**
 * One row in the Money activity list, tagged by source. The merge / sort /
 * group / key pipeline operates only on the source-agnostic `time` and `id`
 * fields; just the leaf renderer branches on `kind`. This keeps off-device card
 * data honest as its own shape rather than masquerading as a `TransactionMeta`.
 */
export type MoneyActivityItem =
  | { kind: 'onchain'; id: string; time: number; tx: TransactionMeta }
  | { kind: 'card'; id: string; time: number; tx: CardTransaction };

export const onchainItem = (tx: TransactionMeta): MoneyActivityItem => ({
  kind: 'onchain',
  id: tx.id,
  time: tx.time ?? 0,
  tx,
});

export const cardItem = (tx: CardTransaction): MoneyActivityItem => ({
  kind: 'card',
  id: tx.hash,
  time: tx.time,
  tx,
});

import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

/**
 * A MetaMask Card payment surfaced in Money activity.
 *
 * Card spends settle as an on-chain ERC-20 transfer OUT of the money account
 * Because they aren’t created in this client, they never reach the local
 * `TransactionController` — they come from the MetaMask Accounts API instead.
 *
 * This only includes on chain data. Later we’ll enrich these with merchant
 * data etc, but this will require the Baanx API
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
  /** Settlement recipient (Baanx). Shown as "Paid to" in the detail sheet. */
  to: Hex;
}

/**
 * A MetaMask Card cashback reward surfaced in Money activity.
 *
 * The mirror image of a {@link CardTransaction}: cashback settles as an on-chain
 * ERC-20 transfer INTO the money account, so it's an inflow rather than an
 * outflow. Like card spends it isn't created in this client — it comes from the
 * MetaMask Accounts API tagged `METAMASK_CARD_CASHBACK`.
 */
export interface CashbackTransaction {
  /** On-chain tx hash. Stable identity for the activity row. */
  hash: Hex;
  /** Settlement time, epoch ms (parsed from the API's ISO timestamp). */
  time: number;
  chainId: Hex;
  /** The token credited to the money account. */
  token: {
    address: Hex;
    symbol: string;
    decimals: number;
  };
  /** Raw, minimal-unit amount of the credited transfer. */
  amount: string;
  /** Where the cashback came from. Shown as "Received from" in the detail sheet. */
  from: Hex;
}

/**
 * One row in the Money activity list, tagged by source. The merge / sort /
 * group / key pipeline operates only on the source-agnostic `time` and `id`
 * fields; just the leaf renderer branches on `kind`. This keeps off-device card
 * data honest as its own shape rather than masquerading as a `TransactionMeta`.
 */
export type MoneyActivityItem =
  | { kind: 'onchain'; id: string; time: number; tx: TransactionMeta }
  | { kind: 'card'; id: string; time: number; tx: CardTransaction }
  | { kind: 'cashback'; id: string; time: number; tx: CashbackTransaction };

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

export const cashbackItem = (tx: CashbackTransaction): MoneyActivityItem => ({
  kind: 'cashback',
  id: tx.hash,
  time: tx.time,
  tx,
});

import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

/**
 * The on-chain settlement shared by every Accounts-API activity row, regardless
 * of kind. These rows aren't created in this client, so they never reach the
 * local `TransactionController` — they come from the MetaMask Accounts API.
 *
 * This is on-chain data only. Later we'll enrich it (e.g. merchant data via the
 * Baanx API), but that's additive.
 */
interface AccountsApiSettlement {
  /** On-chain tx hash. Stable identity for the activity row. */
  hash: Hex;
  /** Settlement time, epoch ms (parsed from the API's ISO timestamp). */
  time: number;
  chainId: Hex;
  /** The settlement token (USDC today, mUSD later). */
  token: {
    address: Hex;
    symbol: string;
    decimals: number;
  };
  /** Raw, minimal-unit amount of the settlement transfer. */
  amount: string;
}

/**
 * An off-device MetaMask Card activity row from the Accounts API. The two kinds
 * are mirror images of one settlement shape and differ only in direction and the
 * counterparty they keep. A `card` is a spend — an ERC-20 transfer OUT of the
 * money account (outflow) — keeping `paidTo` (the settlement recipient, Baanx).
 * A `cashback` is a reward — a transfer INTO the money account (inflow) —
 * keeping `receivedFrom` (the rewarder).
 *
 * Distinct arms (rather than a `direction` flag) keep each kind's counterparty
 * honest: a card has no `receivedFrom`, a cashback has no `paidTo`.
 */
export type AccountsApiActivity =
  | (AccountsApiSettlement & {
      kind: 'card';
      /** Settlement recipient (Baanx). Shown as "Paid to" in the detail sheet. */
      paidTo: Hex;
    })
  | (AccountsApiSettlement & {
      kind: 'cashback';
      /** Where the cashback came from. Shown as "Received from" in the sheet. */
      receivedFrom: Hex;
    });

/**
 * One row in the Money activity list, tagged by source. The merge / sort /
 * group / key pipeline operates only on the source-agnostic `time` and `id`
 * fields; just the leaf renderer branches on `kind`. This keeps off-device
 * Accounts-API data honest as its own shape rather than masquerading as a
 * `TransactionMeta`. Within an `accountsApi` row, `tx.kind` further distinguishes
 * card spends from cashback credits.
 */
export type MoneyActivityItem =
  | { kind: 'onchain'; id: string; time: number; tx: TransactionMeta }
  | { kind: 'accountsApi'; id: string; time: number; tx: AccountsApiActivity };

export const onchainItem = (tx: TransactionMeta): MoneyActivityItem => ({
  kind: 'onchain',
  id: tx.id,
  time: tx.time ?? 0,
  tx,
});

export const accountsApiItem = (
  tx: AccountsApiActivity,
): MoneyActivityItem => ({
  kind: 'accountsApi',
  id: tx.hash,
  time: tx.time,
  tx,
});

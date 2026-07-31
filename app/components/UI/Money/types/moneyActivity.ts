import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

/**
 * Card spends and musdback from the accounts API
 * These aren't created in this client, so they never reach the
 * local `TransactionController` — they come from the MetaMask Accounts API.
 */
interface AccountsApiSettlement {
  /** On-chain tx hash. Stable identity for the activity row. */
  hash: Hex;
  /** Settlement time, epoch ms (parsed from the API's ISO timestamp). */
  time: number;
  chainId: Hex;
  /** The settlement token. */
  token: {
    address: Hex;
    symbol: string;
    decimals: number;
  };
  /** Raw, minimal-unit amount of the settlement transfer. */
  amount: string;
}

export type AccountsApiActivity =
  | (AccountsApiSettlement & {
      kind: 'card';
      paidTo: Hex;
    })
  | (AccountsApiSettlement & {
      kind: 'cashback';
      receivedFrom: Hex;
    })
  | (AccountsApiSettlement & {
      kind: 'refund';
      receivedFrom: Hex;
    });

/**
 * One row in the Money activity list, tagged by source.
 **/
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

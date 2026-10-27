import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';

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
    })
  | (AccountsApiSettlement & {
      /** VBA / Iron (or QA test-wallet) mUSD credit to the Money Account. */
      kind: 'bank_transfer';
      receivedFrom: Hex;
      /**
       * Money Account API transfer status. Only `confirmed` transfers with an
       * on-chain hash become completed API activity; in-flight and errored
       * transfers stay NeoBank rows.
       */
      status: 'confirmed';
    });

/**
 * Off-chain VBA / NeoBank autoramp deposit (PIX → mUSD), before or without an
 * Accounts-API on-chain settlement row. Status is MoonPay `transaction_status`.
 */
export interface NeobankBankTransferActivity {
  id: string;
  autorampId: string;
  /** MoonPay status: Pending, Completed, Failed, Cancelled, … */
  status: string;
  time: number;
  /** Source fiat decimal string when present (BRL). */
  sourceAmount?: string;
  /** Destination mUSD decimal string when present. */
  destinationAmount?: string;
  /** On-chain payout hash when MoonPay has one (used to dedupe vs Accounts API). */
  transactionHash?: Hex;
}

/**
 * One row in the Money activity list, tagged by source.
 **/
export type MoneyActivityItem =
  | { kind: 'onchain'; id: string; time: number; tx: TransactionMeta }
  | { kind: 'accountsApi'; id: string; time: number; tx: AccountsApiActivity }
  | { kind: 'cardProvider'; id: string; time: number; tx: CardTransaction }
  | {
      kind: 'neobank';
      id: string;
      time: number;
      tx: NeobankBankTransferActivity;
    };

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

export const cardProviderItem = (tx: CardTransaction): MoneyActivityItem => ({
  kind: 'cardProvider',
  id: tx.id,
  time: tx.timestamp,
  tx,
});

export const neobankItem = (
  tx: NeobankBankTransferActivity,
): MoneyActivityItem => ({
  kind: 'neobank',
  id: tx.id,
  time: tx.time,
  tx,
});

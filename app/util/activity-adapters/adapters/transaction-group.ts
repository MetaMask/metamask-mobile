/**
 * Mobile-specific TransactionGroup type for the local activity adapter.
 * Derived from metamask-extension shared/lib/multichain/types.ts#TransactionGroup.
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 */
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { TransactionData } from '@metamask/transaction-pay-controller';
import type { ActivityFee, Status, TokenAmount } from '../types';

export interface TransactionGroup {
  hasCancelled?: boolean;
  hasRetried?: boolean;
  /** The earliest transaction in the group (determines type/category). */
  initialTransaction: TransactionMeta & { isSmartTransaction?: boolean };
  nonce?: string;
  /** The most recent transaction (determines status). */
  primaryTransaction: TransactionMeta;
  transactions?: TransactionMeta[];
  /** Optional status override from bridge history or other enrichment. */
  activityStatus?: Status;
  /** Enriched source token (swaps, bridges, converts). */
  sourceToken?: TokenAmount;
  /** Enriched destination token (swaps, bridges). */
  destinationToken?: TokenAmount;
  /** Native asset ticker from NetworkController, overrides bridge-controller symbol. */
  nativeAssetSymbol?: string;
  /** Token metadata from TokensController for contract interactions. */
  contractTokenMetadata?: { symbol?: string; decimals?: number };
  /** Whether the signing account cannot use gas sponsorship. */
  isHardwareWalletAccount?: boolean;
  /** EOA whose Activity feed is rendering this group, when different from the signer. */
  activityAccountAddress?: string;
  /** Required MetaMask Pay child transactions associated with the parent intent. */
  relatedTransactions?: TransactionMeta[];
  /** Ephemeral Pay data used to render the pending EOA-facing token. */
  transactionPayData?: Pick<
    TransactionData,
    'isPostQuote' | 'paymentToken' | 'sourceAmounts'
  >;
  /** Precomputed fees for `@metamask/client-utils` mapLocalTransaction. */
  fees?: ActivityFee[];
}

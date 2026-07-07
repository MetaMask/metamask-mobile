import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../util/activity-adapters';

/**
 * Speed-up / cancel / hardware-wallet sign handlers for pending local EVM rows.
 * Sourced from `useUnifiedTxActions` and threaded down from the list view so the
 * shared `CancelSpeedupModal` (rendered once at the list level) stays in sync.
 */
export interface PendingTransactionActionHandlers {
  isQRHardwareAccount?: boolean;
  isLedgerAccount?: boolean;
  onSpeedUpAction?: (open: boolean, tx?: TransactionMeta) => void;
  onCancelAction?: (open: boolean, tx?: TransactionMeta) => void;
  signQRTransaction?: (tx: TransactionMeta) => void;
  signLedgerTransaction?: (tx: { id: string }) => void;
  cancelUnsignedQRTransaction?: (tx: TransactionMeta) => void;
}

export interface ActivityListItemRowProps
  extends PendingTransactionActionHandlers {
  item: ActivityListItem;
  index?: number;
  onPress?: (item: ActivityListItem) => void;
  /**
   * Optional pre-resolved title. Used to preserve the legacy Activity contract
   * for swap/bridge rows derived from bridge history.
   */
  title?: string;
  bridgeHistoryItem?: BridgeHistoryItem;
}

export interface ActivityListItemRowContent {
  title: string;
  subtitle?: string;
  primaryToken?: TokenAmount;
  secondaryToken?: TokenAmount;
  primaryAmount?: string;
  secondaryAmount?: string;
  avatarTokens: TokenAmount[];
  avatarIconUrl?: string;
  perpsMarketSymbol?: string;
}

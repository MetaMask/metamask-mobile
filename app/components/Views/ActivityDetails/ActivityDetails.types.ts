import type { CaipChainId } from '@metamask/utils';
import type { ActivityListItem } from '../../../util/activity-adapters';

/**
 * Route params for the redesigned activity details screen.
 *
 * Kept serializable on purpose: the screen re-resolves the
 * {@link ActivityListItem} from these params (rather than receiving the item
 * directly), so it survives deep-links, toasts and list refreshes — mirroring
 * the extension's `ui/pages/details` flow. Provider-backed rows (Perps /
 * Predict) that can't be re-resolved are handed off out-of-band via
 * `preloadedActivityItemStore`, not through these params.
 */
export interface ActivityDetailsParams {
  /** CAIP-2 chain id of the transaction (e.g. `eip155:1`, `solana:…`). */
  chainId: CaipChainId;
  /** Transaction identifier — the transaction hash (lowercased on lookup). */
  txIdentifier?: string;
  /**
   * Key into the transient `preloadedActivityItemStore` for provider-backed
   * rows (Perps / Predict) that can't be re-resolved by hash. Serializable; the
   * row object itself is held out-of-band in the store.
   */
  preloadKey?: string;
}

/** Props shared by every per-type details template. */
export interface ActivityDetailsTemplateProps<
  T extends ActivityListItem = ActivityListItem,
> {
  item: T;
}

import type { CaipChainId } from '@metamask/utils';
import type { ActivityListItem } from '../../../util/activity-adapters';

/**
 * Route params for the redesigned activity details screen.
 *
 * The screen re-resolves the {@link ActivityListItem} from these params (rather
 * than receiving the item directly), so it survives deep-links, toasts and list
 * refreshes — mirroring the extension's `ui/pages/details` flow.
 */
export interface ActivityDetailsParams {
  /** CAIP-2 chain id of the transaction (e.g. `eip155:1`, `solana:…`). */
  chainId: CaipChainId;
  /** Transaction identifier — the transaction hash (lowercased on lookup). */
  txIdentifier?: string;
}

/** Props shared by every per-type details template. */
export interface ActivityDetailsTemplateProps<
  T extends ActivityListItem = ActivityListItem,
> {
  item: T;
}

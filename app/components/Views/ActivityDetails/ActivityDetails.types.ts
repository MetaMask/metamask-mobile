import type { CaipChainId } from '@metamask/utils';

/**
 * Route params for the redesigned activity details screen.
 *
 * Kept serializable on purpose: the screen re-resolves the
 * {@link ActivityListItem} from these params (rather than receiving the item
 * directly), so it survives deep-links, toasts and list refreshes — mirroring
 * the extension's `ui/pages/details` flow.
 */
export interface ActivityDetailsParams {
  /** CAIP-2 chain id of the transaction (e.g. `eip155:1`, `solana:…`). */
  chainId: CaipChainId;
  /** Transaction identifier — hash, local meta id, or domain id. */
  txIdentifier?: string;
}

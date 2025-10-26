// Third party dependencies.
import { FlashListProps } from '@shopify/flash-list';

// Internal dependencies.
import { TokenI } from '../types';

/**
 * FlashList asset key interface for token list items.
 */
export interface FlashListAssetKey {
  /**
   * Token contract address.
   */
  address: string;
  /**
   * Chain ID where the token exists.
   */
  chainId: string | undefined;
  /**
   * Whether the token is staked.
   */
  isStaked: boolean | undefined;
}

/**
 * TokenList component props.
 */
export interface TokenListProps {
  /**
   * Array of token keys to display in the list.
   */
  tokenKeys: FlashListAssetKey[];
  /**
   * Whether the list is currently refreshing.
   */
  refreshing: boolean;
  /**
   * Callback function triggered when refresh is requested.
   */
  onRefresh: () => void;
  /**
   * Callback function to show remove menu for a token.
   */
  showRemoveMenu: (arg: TokenI) => void;
  /**
   * Whether to show percentage change for tokens.
   * @default true
   */
  showPercentageChange?: boolean;
  /**
   * Callback function to show scam warning modal.
   */
  setShowScamWarningModal: () => void;
  /**
   * Additional props to pass to the FlashList component.
   */
  flashListProps?: Partial<FlashListProps<FlashListAssetKey>>;
  /**
   * Maximum number of items to display. If undefined, displays all items.
   */
  maxItems?: number;
}

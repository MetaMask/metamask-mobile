import { Hex } from '@metamask/utils';
import { ImageSourcePropType } from 'react-native';

import { TokenI } from '../../../UI/Tokens/types';

export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export interface AssetType extends TokenI {
  assetId?: string;
  accountId?: string;
  disabled?: boolean;
  disabledMessage?: string;
  networkBadgeSource?: ImageSourcePropType;
  tokenId?: string;
  isSelected?: boolean;
  standard?: TokenStandard;
  description?: string;
  balanceInSelectedCurrency?: string;
  type?: string;
  fiat?: {
    balance?: number;
    currency?: string;
    conversionRate?: number;
  };
  rawBalance?: Hex;
}

export interface HighlightedActionButton {
  buttonLabel: string;
  onPress: () => void;
  isDisabled?: boolean;
}

export type HighlightedItemPosition = 'in_asset_list' | 'outside_of_asset_list';

export interface HighlightedPaymentIcon {
  type: 'payment';
  icon: string;
}

export type HighlightedItemIcon = string | HighlightedPaymentIcon;

export interface HighlightedItem {
  /** Controls where the row is rendered in the asset picker UI. */
  position: HighlightedItemPosition;
  /** Either an IconName string, a remote icon URI, or a payment icon descriptor. */
  icon: HighlightedItemIcon;
  /** Primary label shown for the highlighted row. */
  name: string;
  /** Secondary label shown under the primary name. */
  name_description: string;
  /** Callback fired when the row itself is pressed. */
  action: () => void;
  /** Optional action buttons shown on the right side of the row. */
  actions?: HighlightedActionButton[];
  /** Right-side fiat value shown when no action buttons are rendered. */
  fiat: string;
  /** Right-side fiat subtitle shown below the fiat value. */
  fiat_description: string;
  /** Selected state used to apply pressed/selected background styling. */
  isSelected?: boolean;
  /** Loading state that shows a spinner and hides action buttons. */
  isLoading?: boolean;
}

export type TokenListItem = AssetType | HighlightedItem;

export const isHighlightedItemInAssetList = (
  item: TokenListItem,
): item is HighlightedItem =>
  'position' in item && item.position === 'in_asset_list';

export const isHighlightedItemOutsideAssetList = (
  item: TokenListItem,
): item is HighlightedItem =>
  'position' in item && item.position === 'outside_of_asset_list';

export interface Nft {
  address: string;
  standard: 'ERC721' | 'ERC1155';
  name?: string;
  collectionName?: string;
  image?: string;
  chainId: string;
  tokenId: string;
  accountId: string;
  networkBadgeSource: ImageSourcePropType;
  balance?: string;
}

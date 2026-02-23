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
}

export interface HighlightedAssetListItem {
  type: 'highlighted_asset';
  icon: string;
  name: string;
  name_description: string;
  fiat: string;
  fiat_description: string;
  action: () => void;
  isSelected?: boolean;
}

export interface HighlightedActionListItem {
  type: 'highlighted_action';
  icon: string;
  name: string;
  name_description: string;
  actions: HighlightedActionButton[];
}

export type TokenListItem =
  | AssetType
  | HighlightedAssetListItem
  | HighlightedActionListItem;

export const isHighlightedAssetListItem = (
  item: TokenListItem,
): item is HighlightedAssetListItem => item.type === 'highlighted_asset';

export const isHighlightedActionListItem = (
  item: TokenListItem,
): item is HighlightedActionListItem => item.type === 'highlighted_action';

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

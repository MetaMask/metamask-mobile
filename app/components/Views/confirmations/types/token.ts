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

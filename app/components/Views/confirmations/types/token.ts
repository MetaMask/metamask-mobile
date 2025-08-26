import { ImageSourcePropType } from 'react-native';
import { TokenI } from '../../../UI/Tokens/types';

export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export interface AssetType extends TokenI {
  accountId?: string;
  networkBadgeSource?: ImageSourcePropType;
  tokenId?: string;
  isSelected?: boolean;
  standard?: TokenStandard;
  description?: string;
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

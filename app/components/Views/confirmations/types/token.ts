import { ImageSourcePropType } from 'react-native';
import { TokenI } from '../../../UI/Tokens/types';

export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export interface AssetType extends TokenI {
  networkBadgeSource?: ImageSourcePropType;
  tokenId?: string;
  isSelected?: boolean;
}

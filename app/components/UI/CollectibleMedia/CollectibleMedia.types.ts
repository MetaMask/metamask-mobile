import { Nft } from '@metamask/assets-controllers';
import { ViewStyle } from 'react-native';

export interface Collectible {
  name: string;
  tokenId: string;
  image: string | string[];
  imagePreview: string;
  address: string;
  animation?: string;
  backgroundColor: string;
  tokenURI: string;
  contractName?: string;
  standard: string;
  imageOriginal?: string;
  error: string | undefined;
  description?: string;
  rarityRank?: number;
  isCurrentlyOwned?: boolean;
  chainId: number;
}

type NFTData = Omit<Nft, 'image'> & {
  image: Nft['image'] | string[];
};

export interface CollectibleMediaProps {
  collectible: NFTData;
  tiny?: boolean;
  small?: boolean;
  big?: boolean;
  renderAnimation?: boolean;
  cover?: boolean;
  style?: ViewStyle;
  onClose?: () => void;
  onPressColectible?: () => void;
  isTokenImage?: boolean;
  isFullRatio?: boolean;
}

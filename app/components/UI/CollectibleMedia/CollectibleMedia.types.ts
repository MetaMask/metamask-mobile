import { Nft } from '@metamask/assets-controllers';
import { ViewStyle } from 'react-native';

export interface Collectible {
  name: string;
  tokenId: number;
  image: string;
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
}

export interface CollectibleMediaProps {
  collectible: Nft;
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

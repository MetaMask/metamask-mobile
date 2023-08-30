import { ViewStyle } from 'react-native';

export interface Collectible {
  name: string;
  tokenId: number;
  image: string;
  imagePreview: string;
  address: string;
  animation?: string;
  backgroundColor: string;
  contractName?: string;
  standard: string;
}

export interface CollectibleMediaProps {
  collectible: Collectible;
  tiny?: boolean;
  small?: boolean;
  big?: boolean;
  renderAnimation?: boolean;
  cover?: boolean;
  style?: ViewStyle;
  onClose?: () => void;
  onPressColectible?: () => void;
}

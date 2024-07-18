import { Nft } from '@metamask/assets-controllers';
import { ViewStyle } from 'react-native';

interface Attribute {
  key: string;
  value: string;
}

interface FloorAsk {
  sourceDomain?: string;
  source: {
    id: string;
    domain: string;
    name: string;
    icon: string;
    url: string;
  };
  price: {
    amount: {
      native: number;
      decimal: number;
      usd: number;
    };
    currency: {
      symbol: string;
    };
  };
}

interface TopBid {
  sourceDomain?: string;
  price: {
    amount: {
      native: number;
      decimal: number;
      usd: number;
    };
    currency: {
      symbol: string;
    };
  };
}

interface LastSale {
  orderSource?: string;
  timestamp: number;
  sourceDomain: string;
  price: {
    amount: {
      native: number;
      decimal: string;
      usd: number;
    };
    currency: {
      symbol: string;
    };
  };
}

interface Collection {
  openseaVerificationStatus?: string;
  tokenCount?: string;
  name?: string;
  ownerCount?: string;
  creator?: string;
  symbol?: string;
  contractDeployedAt?: string;
  floorAsk?: FloorAsk;
  topBid?: TopBid;
}

export interface Collectible {
  name: string;
  tokenId: number;
  image: string;
  imagePreview?: string;
  address: string;
  animation?: string;
  backgroundColor?: string;
  tokenURI?: string;
  contractName?: string;
  standard: string;
  imageOriginal?: string;
  error?: string | undefined;
  attributes?: Attribute[];
  collection?: Collection;
  lastSale?: LastSale;
  description?: string;
  rarityRank?: number;
  topBid?: TopBid;
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

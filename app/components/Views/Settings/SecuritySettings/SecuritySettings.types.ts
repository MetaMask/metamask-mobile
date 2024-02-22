import { ImageSourcePropType } from 'react-native';

export interface Gateway {
  key: number;
  value: string;
  label: string;
}
export interface GatewayWithAvailability {
  key: string;
  value: string;
  label: string;
  available: boolean;
}

export interface HeadingProps {
  first?: boolean;
  children: React.FC;
}

export interface SecuritySettingsParams {
  scrollToDetectNFTs?: boolean;
}

export interface EtherscanNetworksType {
  [key: string]: { domain: string; subdomain: string; networkId: string };
}

export interface NetworksI {
  [key: string]: {
    name: string;
    imageSource?: ImageSourcePropType;
    shortName: string;
    networkId?: number;
    chainId?: number;
    hexChainId?: string;
    color: string;
    networkType: string;
  };
}

import { ImageSourcePropType } from 'react-native';

export interface NetworksI {
  [key: string]: {
    name: string;
    imageSource?: ImageSourcePropType;
    shortName: string;
    networkId?: number;
    chainId?: string;
    color: string;
    networkType: string;
  };
}

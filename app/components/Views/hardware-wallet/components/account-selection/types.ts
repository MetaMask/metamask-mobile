import { type ImageSourcePropType } from 'react-native';

export interface MockAsset {
  address: string;
  balance: string;
  iconSource: ImageSourcePropType;
  kind: 'network' | 'token';
  label?: string;
  title: string;
}

export interface AccountSelectionItem {
  address: string;
  index: number;
  isExistingAccount: boolean;
  isSelected: boolean;
  totalBalance: string;
  assets: MockAsset[];
}

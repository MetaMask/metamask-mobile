import type {
  IconSize,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface PerpsLiquidationPriceValueProps {
  liquidationPrice?: string | number | null;
  currentPrice?: number;
  isLong: boolean;
  isCross?: boolean;
  privacyMode?: boolean;
  textVariant?: TextVariant;
  iconSize?: IconSize;
  priceTestID?: string;
  distanceTestID?: string;
}

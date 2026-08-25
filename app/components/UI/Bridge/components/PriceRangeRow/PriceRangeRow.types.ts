import type { BridgeToken } from '../../types';

export interface PriceRangeRowProps {
  token?: BridgeToken;
  rangeLabel?: string;
  onPress: () => void;
}

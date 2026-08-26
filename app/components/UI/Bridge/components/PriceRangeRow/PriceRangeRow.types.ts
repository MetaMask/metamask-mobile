import type { BridgeToken } from '../../types';

export interface PriceRangeRowProps {
  token?: BridgeToken;
  minLabel?: string;
  maxLabel?: string;
  onPress: () => void;
}

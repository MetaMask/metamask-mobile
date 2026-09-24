import type {
  PriceRangeTokenSide,
  RecurringPriceRange,
} from '../../utils/priceRange';
import type { BridgeToken } from '../../types';

export interface PriceRangeSheetProps {
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceUsdRate?: number;
  destUsdRate?: number;
  initialTokenSide?: PriceRangeTokenSide;
  initialMin?: string;
  initialMax?: string;
  onConfirm: (priceRange?: RecurringPriceRange) => void;
  goBack: () => void;
}

import type {
  PriceRangeTokenSide,
  RecurringPriceRange,
} from '../../utils/priceRange';
import type { BridgeToken } from '../../types';

export interface PriceRangeSheetProps {
  isVisible: boolean;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceFiatRate?: number;
  destFiatRate?: number;
  currentCurrency: string;
  initialTokenSide?: PriceRangeTokenSide;
  initialMin?: string;
  initialMax?: string;
  onClose: () => void;
  onConfirm: (priceRange: RecurringPriceRange) => void;
}

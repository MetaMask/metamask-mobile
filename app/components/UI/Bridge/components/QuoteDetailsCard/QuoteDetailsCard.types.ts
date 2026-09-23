import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { GaslessFeeAsset } from '../../utils/getGaslessFeeAsset';

export interface QuoteDetailsCardProps {
  hasInsufficientBalance: boolean;
  location: MetaMetricsSwapsEventSource;
  isGaslessSwapRedesignTreatment?: boolean;
  gaslessFeeAsset?: GaslessFeeAsset;
}

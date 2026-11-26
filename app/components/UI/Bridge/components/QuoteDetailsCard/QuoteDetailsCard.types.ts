import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { NetworkFeeAsset } from '../../utils/getNetworkFeeAsset';

export interface QuoteDetailsCardProps {
  hasInsufficientBalance: boolean;
  location: MetaMetricsSwapsEventSource;
  networkFeeAsset?: NetworkFeeAsset;
}

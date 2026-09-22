import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { PriceImpactModalType } from './constants';

export interface PriceImpactModalRouterParams {
  type: PriceImpactModalType;
  location: MetaMetricsSwapsEventSource;
}

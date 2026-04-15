import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { BridgeToken } from '../../types';
import { PriceImpactModalType } from './constants';

export interface PriceImpactModalRouterParams {
  type: PriceImpactModalType;
  token: BridgeToken;
  location: MetaMetricsSwapsEventSource;
}

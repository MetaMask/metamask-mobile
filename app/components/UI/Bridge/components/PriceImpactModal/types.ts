import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { BridgeToken } from '../../types';
import { PriceImpactModalType } from './constants';

export interface PriceImpactModalRouterParams {
  type: PriceImpactModalType;
  /**
   * Source token for balance lookups. Optional because the source token can be
   * unset when the modal is opened; the modal reads it defensively
   * (`token?.address`).
   */
  token?: BridgeToken;
  location: MetaMetricsSwapsEventSource;
}

import { BatchSellMetricsLocation } from '@metamask/bridge-controller';

export interface BatchSellTokenSelectRouteParams {
  batchSellLocation?: BatchSellMetricsLocation;
  preferredDestinationSymbol?: string;
  preserveBridgeState?: boolean;
}

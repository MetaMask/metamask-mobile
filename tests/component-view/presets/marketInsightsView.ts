import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { UnifiedRampRoutingType } from '../../../app/reducers/fiatOrders';
import { initialStateBridge } from './bridge';

/**
 * Redux preset for MarketInsightsView component-view tests: bridge + fiat state,
 * market insights and ramps V2 flags (version gate 0.0.0 for unit/view runs).
 */
export const initialStateMarketInsightsView = () =>
  initialStateBridge({ deterministicFiat: true }).withRemoteFeatureFlags({
    aiSocialMarketAnalysisEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    rampsUnifiedBuyV2: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
  } as unknown as Record<string, unknown>);

/**
 * Ensures `goToBuy` does not open eligibility/error modals (unified routing).
 */
export const fiatOrdersRampRoutingSupported: DeepPartial<RootState> = {
  fiatOrders: {
    rampRoutingDecision: UnifiedRampRoutingType.AGGREGATOR,
  },
};

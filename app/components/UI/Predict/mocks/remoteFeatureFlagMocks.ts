import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import { PredictMarketHighlightsFlag } from '../types/flags';

const mockEnabledPredictLDFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

export const mockedPredictFeatureFlagsEnabledState: Record<
  string,
  VersionGatedFeatureFlag
> = {
  predictTradingEnabled: mockEnabledPredictLDFlag,
};

export const mockPredictMarketHighlightsFlag: PredictMarketHighlightsFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
  highlights: [
    {
      category: 'trending',
      markets: ['market-highlight-1', 'market-highlight-2'],
    },
    { category: 'crypto', markets: ['market-highlight-3'] },
    {
      category: 'sports',
      markets: ['market-highlight-4', 'market-highlight-5'],
    },
  ],
};

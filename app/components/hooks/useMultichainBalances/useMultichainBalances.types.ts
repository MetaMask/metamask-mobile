import { AggregatedPercentageProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentage.types';
import { AggregatedPercentageCrossChainsProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.types';

export interface MultichainBalancesData {
  displayBalance: string;
  displayCurrency: string;
  tokenFiatBalancesCrossChains: AggregatedPercentageCrossChainsProps['tokenFiatBalancesCrossChains'];
  totalFiatBalance: number;
  totalTokenFiat: number;
  shouldShowAggregatedPercentage: boolean;
  isPortfolioVieEnabled: boolean;
  aggregatedBalance: AggregatedPercentageProps;
}

export interface UseMultichainBalancesHook {
  multichainBalances: MultichainBalancesData;
}

import { AggregatedPercentageProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentage.types';
import { AggregatedPercentageCrossChainsProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.types';

// Renamed to avoid conflict with keyring-api
export interface BalanceInfo {
  amount: string;
  unit: string;
}

export interface MultichainBalancesData {
  displayBalance?: string;
  displayCurrency: string;
  tokenFiatBalancesCrossChains: AggregatedPercentageCrossChainsProps['tokenFiatBalancesCrossChains'];
  totalFiatBalance: string;
  totalNativeTokenBalance: string;
  nativeTokenUnit: string;
  aggregatedBalance: AggregatedPercentageProps;
  shouldShowAggregatedPercentage: boolean;
  isPortfolioVieEnabled: boolean;
}

export interface UseMultichainBalancesHook {
  multichainBalancesForAllAccounts: Record<string, MultichainBalancesData>;
  selectedAccountMultichainBalance: MultichainBalancesData | undefined;
}

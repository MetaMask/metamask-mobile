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
  totalFiatBalance: number;
  totalTokenFiat: number;
  totalBalanceFiat?: string;
  aggregatedBalance: AggregatedPercentageProps;
  shouldShowAggregatedPercentage: boolean;
  isPortfolioVieEnabled: boolean;
  nativeTokenBalance?: BalanceInfo;
  accountBalances?: Record<string, BalanceInfo>;
}

export interface UseMultichainBalancesHook {
  multichainBalancesForAllAccounts: Record<string, MultichainBalancesData>;
  selectedAccountMultichainBalance: MultichainBalancesData;
}

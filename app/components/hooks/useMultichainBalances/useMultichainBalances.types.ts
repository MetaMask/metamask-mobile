import { InternalAccount } from '@metamask/keyring-internal-api';
import { AggregatedPercentageProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentage.types';
import { AggregatedPercentageCrossChainsProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.types';

export interface MultichainBalancesData {
  displayBalance: string | undefined;
  displayCurrency: string;
  tokenFiatBalancesCrossChains: AggregatedPercentageCrossChainsProps['tokenFiatBalancesCrossChains'];
  totalFiatBalance: number;
  totalTokenFiat: number;
  shouldShowAggregatedPercentage: boolean;
  isPortfolioVieEnabled: boolean;
  aggregatedBalance: AggregatedPercentageProps;
  conversionRate: number;
}

export interface UseMultichainBalancesHook {
  multichainBalancesForAllAccounts: Record<
    InternalAccount['id'],
    MultichainBalancesData
  >;
  selectedAccountMultichainBalance: MultichainBalancesData;
}

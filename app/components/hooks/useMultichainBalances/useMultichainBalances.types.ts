import { Balance } from '@metamask/keyring-api';
import { AggregatedPercentageProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentage.types';
import { AggregatedPercentageCrossChainsProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.types';
import { InternalAccount } from '@metamask/keyring-internal-api';

export interface MultichainBalancesData {
  displayBalance?: string;
  displayCurrency: string;
  tokenFiatBalancesCrossChains: AggregatedPercentageCrossChainsProps['tokenFiatBalancesCrossChains'];
  totalFiatBalance: number;
  totalTokenFiat: number;
  aggregatedBalance: AggregatedPercentageProps;
  shouldShowAggregatedPercentage: boolean;
  isPortfolioVieEnabled: boolean;
  nativeTokenBalance?: Balance;
  accountBalances?: Record<string, Balance>;
}

export interface UseMultichainBalancesHook {
  multichainBalancesForAllAccounts: Record<
    InternalAccount['id'],
    MultichainBalancesData
  >;
  selectedAccountMultichainBalance: MultichainBalancesData;
}

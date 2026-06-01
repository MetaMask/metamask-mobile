import { InternalAccount } from '@metamask/keyring-internal-api';
import { AggregatedPercentageCrossChainsProps } from '../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.types';

export interface AggregatedBalance {
  ethFiat: number;
  tokenFiat: number;
  tokenFiat1dAgo: number;
  ethFiat1dAgo: number;
}

export interface MultichainBalancesData {
  displayBalance?: string;
  displayCurrency: string;
  tokenFiatBalancesCrossChains: AggregatedPercentageCrossChainsProps['tokenFiatBalancesCrossChains'];
  totalFiatBalance: number | undefined;
  totalNativeTokenBalance: string | undefined;
  nativeTokenUnit: string;
  shouldShowAggregatedPercentage: boolean;
  isPortfolioViewEnabled: boolean;
  aggregatedBalance: AggregatedBalance;
  isLoadingAccount: boolean;
}

export interface UseAllAccountsMultichainBalancesHook {
  multichainBalancesForAllAccounts: Record<
    InternalAccount['id'],
    MultichainBalancesData
  >;
}

export interface UseSelectedAccountMultichainBalancesHook {
  selectedAccountMultichainBalance?: MultichainBalancesData;
}

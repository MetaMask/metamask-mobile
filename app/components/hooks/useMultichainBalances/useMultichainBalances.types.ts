import { InternalAccount } from '@metamask/keyring-internal-api';
import { TokensWithBalances } from '../useGetFormattedTokensPerChain';

export interface AggregatedBalance {
  ethFiat: number;
  tokenFiat: number;
  tokenFiat1dAgo: number;
  ethFiat1dAgo: number;
}

export type TokenFiatBalancesCrossChains = {
  chainId: string;
  nativeFiatValue: number;
  tokenFiatBalances: number[];
  tokensWithBalances: TokensWithBalances[];
}[];

export interface MultichainBalancesData {
  displayBalance?: string;
  displayCurrency: string;
  tokenFiatBalancesCrossChains: TokenFiatBalancesCrossChains;
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

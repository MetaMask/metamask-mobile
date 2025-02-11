import { TokensWithBalances } from '../../../../components/hooks/useGetFormattedTokensPerChain';

export interface AggregatedPercentageCrossChainsProps {
  privacyMode?: boolean;
  totalFiatCrossChains: number;
  tokenFiatBalancesCrossChains: {
    chainId: string;
    nativeFiatValue: number;
    tokenFiatBalances: number[];
    tokensWithBalances: TokensWithBalances[];
  }[];
}

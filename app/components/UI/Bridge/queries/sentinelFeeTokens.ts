export const SENTINEL_FEE_TOKENS_QUERY_KEY =
  'SentinelFeeTokensDataService:getSentinelFeeTokens' as const;

export const sentinelFeeTokensQueries = {
  getSentinelFeeTokens: (staleTime: number) => ({
    queryKey: [SENTINEL_FEE_TOKENS_QUERY_KEY] as const,
    staleTime,
  }),
};

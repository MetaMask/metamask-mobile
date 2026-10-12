import {
  SENTINEL_FEE_TOKENS_QUERY_KEY,
  sentinelFeeTokensQueries,
} from './sentinelFeeTokens';

describe('sentinelFeeTokensQueries.getSentinelFeeTokens', () => {
  it('uses one stable shared query key', () => {
    const firstDescriptor =
      sentinelFeeTokensQueries.getSentinelFeeTokens(60_000);
    const secondDescriptor =
      sentinelFeeTokensQueries.getSentinelFeeTokens(900_000);

    expect(firstDescriptor.queryKey).toStrictEqual([
      SENTINEL_FEE_TOKENS_QUERY_KEY,
    ]);
    expect(secondDescriptor.queryKey).toStrictEqual(firstDescriptor.queryKey);
  });

  it('uses the configured stale time', () => {
    const descriptor = sentinelFeeTokensQueries.getSentinelFeeTokens(60_000);

    expect(descriptor.staleTime).toBe(60_000);
  });
});

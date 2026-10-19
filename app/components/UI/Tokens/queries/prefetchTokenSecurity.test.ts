import { QueryClient } from '@tanstack/react-query';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import { prefetchTokenSecurity } from './prefetchTokenSecurity';
import { tokenListSecurityBadgeKeys } from './tokenSecurityBadgeKeys';
import { tokenSecurityQueryOptions } from './tokenSecurityQueryOptions';
import { requestTokenSecurityForAsset } from '../util/tokenSecurityBadgeBatch';

jest.mock('../util/tokenSecurityBadgeBatch', () => ({
  ...jest.requireActual('../util/tokenSecurityBadgeBatch'),
  requestTokenSecurityForAsset: jest.fn(),
}));

const mockRequestTokenSecurityForAsset = jest.mocked(
  requestTokenSecurityForAsset,
);

const USDC_LOWERCASE =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

const USDC_CHECKSUMMED =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as CaipAssetType;

const SECURITY_DATA = {
  resultType: 'Verified',
  features: [],
} as unknown as TokenSecurityData;

describe('prefetchTokenSecurity', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestTokenSecurityForAsset.mockResolvedValue(SECURITY_DATA);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('populates the shared entry so the page renders without fetching', async () => {
    prefetchTokenSecurity(queryClient, USDC_LOWERCASE);

    await new Promise(process.nextTick);

    expect(
      queryClient.getQueryData(
        tokenListSecurityBadgeKeys.byAsset(USDC_LOWERCASE),
      ),
    ).toBe(SECURITY_DATA);
  });

  it('writes under the normalized key so a checksummed reader hits it', async () => {
    prefetchTokenSecurity(queryClient, USDC_CHECKSUMMED);

    await new Promise(process.nextTick);

    expect(
      queryClient.getQueryData(
        tokenListSecurityBadgeKeys.byAsset(USDC_LOWERCASE),
      ),
    ).toBe(SECURITY_DATA);
  });

  it('does nothing without an asset id', () => {
    prefetchTokenSecurity(queryClient, null);

    expect(mockRequestTokenSecurityForAsset).not.toHaveBeenCalled();
  });

  // Entry from a token list is already warm, so the prefetch that runs on
  // every Token Details mount must not refetch over it.
  it('leaves a fresh entry alone', async () => {
    queryClient.setQueryData(
      tokenListSecurityBadgeKeys.byAsset(USDC_LOWERCASE),
      SECURITY_DATA,
    );

    prefetchTokenSecurity(queryClient, USDC_LOWERCASE);
    await new Promise(process.nextTick);

    expect(mockRequestTokenSecurityForAsset).not.toHaveBeenCalled();
  });

  // The whole reason both go through `tokenSecurityQueryOptions`: a prefetch
  // with its own shorter staleTime would refetch over a warm badge entry.
  it('prefetches on the same terms the hook subscribes on', () => {
    const options = tokenSecurityQueryOptions(USDC_LOWERCASE);

    expect(options.queryKey).toEqual(
      tokenListSecurityBadgeKeys.byAsset(USDC_LOWERCASE),
    );
    expect(options.staleTime).toBe(options.gcTime);
  });

  it('swallows a rejection rather than surfacing an unhandled promise', async () => {
    mockRequestTokenSecurityForAsset.mockRejectedValue(new Error('network'));

    expect(() =>
      prefetchTokenSecurity(queryClient, USDC_LOWERCASE),
    ).not.toThrow();

    await new Promise(process.nextTick);
  });
});

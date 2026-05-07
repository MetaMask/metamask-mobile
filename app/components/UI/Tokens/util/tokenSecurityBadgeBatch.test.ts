import {
  fetchTokenAssets,
  type TokenAsset,
  type TokenSecurityData,
} from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import {
  normalizeCaipAssetIdForTokenApi,
  requestTokenSecurityForAsset,
} from './tokenSecurityBadgeBatch';

jest.mock('@metamask/assets-controllers', () => ({
  fetchTokenAssets: jest.fn(),
}));

const mockFetchTokenAssets = jest.mocked(fetchTokenAssets);

function tokenAssetFixture(
  partial: Pick<TokenAsset, 'assetId'> &
    Partial<Pick<TokenAsset, 'name' | 'symbol' | 'decimals'>> & {
      securityData?: TokenSecurityData | null;
    },
): TokenAsset {
  return {
    name: '',
    symbol: '',
    decimals: 18,
    ...partial,
  } as TokenAsset;
}

const USDC_LOWER =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

const USDC_MIXED =
  'eip155:1/erc20:0xa0B86991c6218b36c1d19D4a2e9eb0cE3606eB48' as CaipAssetType;

async function waitForBatchFlush(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 64);
  });
}

describe('normalizeCaipAssetIdForTokenApi', () => {
  it('lowercases the erc-20 address segment for eip155 erc20 ids', () => {
    const input =
      'eip155:1/erc20:0xABCDEF0123456789ABCDEF0123456789ABCDEF01' as CaipAssetType;

    const result = normalizeCaipAssetIdForTokenApi(input);

    expect(result).toBe(
      'eip155:1/erc20:0xabcdef0123456789abcdef0123456789abcdef01',
    );
  });

  it('preserves slip44 and other non-erc20 asset ids', () => {
    const native = 'eip155:1/slip44:60' as CaipAssetType;

    const result = normalizeCaipAssetIdForTokenApi(native);

    expect(result).toBe(native);
  });

  it('returns the original string when the erc20 pattern does not match', () => {
    const opaque = 'not-a-caip-id' as CaipAssetType;

    const result = normalizeCaipAssetIdForTokenApi(opaque);

    expect(result).toBe(opaque);
  });
});

describe('requestTokenSecurityForAsset', () => {
  beforeEach(() => {
    mockFetchTokenAssets.mockReset();
  });

  it('resolves waiter data when request id casing differs from api assetId casing', async () => {
    mockFetchTokenAssets.mockResolvedValue([
      tokenAssetFixture({
        assetId: USDC_LOWER,
        securityData: { resultType: 'Verified' } as TokenSecurityData,
      }),
    ]);

    const p = requestTokenSecurityForAsset(USDC_MIXED);

    await waitForBatchFlush();

    await expect(p).resolves.toEqual({ resultType: 'Verified' });

    expect(mockFetchTokenAssets).toHaveBeenCalledWith([USDC_LOWER], {
      includeTokenSecurityData: true,
    });
  });

  it('deduplicates erc-20 ids that differ only by address casing into one fetch', async () => {
    mockFetchTokenAssets.mockResolvedValue([
      tokenAssetFixture({
        assetId: USDC_LOWER,
        securityData: { resultType: 'Verified' } as TokenSecurityData,
      }),
    ]);

    const p1 = requestTokenSecurityForAsset(USDC_MIXED);
    const p2 = requestTokenSecurityForAsset(USDC_LOWER);

    await waitForBatchFlush();

    expect(mockFetchTokenAssets).toHaveBeenCalledTimes(1);
    expect(mockFetchTokenAssets.mock.calls[0][0]).toEqual([USDC_LOWER]);

    await expect(p1).resolves.toEqual({ resultType: 'Verified' });
    await expect(p2).resolves.toEqual({ resultType: 'Verified' });
  });

  it('batches multiple asset ids into one fetchTokenAssets call', async () => {
    const dai =
      'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f' as CaipAssetType;

    mockFetchTokenAssets.mockResolvedValue([
      tokenAssetFixture({
        assetId: USDC_LOWER,
        securityData: { resultType: 'Verified' } as TokenSecurityData,
      }),
      tokenAssetFixture({
        assetId: dai,
        securityData: { resultType: 'Warning' } as TokenSecurityData,
      }),
    ]);

    const pUsdc = requestTokenSecurityForAsset(USDC_LOWER);
    const pDai = requestTokenSecurityForAsset(dai);

    await waitForBatchFlush();

    expect(mockFetchTokenAssets).toHaveBeenCalledTimes(1);
    expect(mockFetchTokenAssets.mock.calls[0][0]).toEqual(
      expect.arrayContaining([USDC_LOWER, dai]),
    );
    expect(mockFetchTokenAssets.mock.calls[0][0]).toHaveLength(2);
    expect(mockFetchTokenAssets.mock.calls[0][1]).toEqual({
      includeTokenSecurityData: true,
    });

    await expect(pUsdc).resolves.toEqual({ resultType: 'Verified' });
    await expect(pDai).resolves.toEqual({ resultType: 'Warning' });
  });

  it('resolves null when fetchTokenAssets throws', async () => {
    mockFetchTokenAssets.mockRejectedValue(new Error('network'));

    const p = requestTokenSecurityForAsset(USDC_LOWER);

    await waitForBatchFlush();

    await expect(p).resolves.toBeNull();
  });

  it('splits requests when more than 100 distinct asset ids flush together', async () => {
    const ids: CaipAssetType[] = Array.from({ length: 101 }, (_, i) => {
      const suffix = i.toString(16).padStart(40, '0');
      return `eip155:1/erc20:0x${suffix}` as CaipAssetType;
    });

    mockFetchTokenAssets.mockImplementation(async (chunk: CaipAssetType[]) =>
      chunk.map((assetId) =>
        tokenAssetFixture({
          assetId,
          securityData: { resultType: 'Benign' } as TokenSecurityData,
        }),
      ),
    );

    const promises = ids.map((id) => requestTokenSecurityForAsset(id));

    await waitForBatchFlush();

    expect(mockFetchTokenAssets).toHaveBeenCalledTimes(2);
    expect(mockFetchTokenAssets.mock.calls[0][0]).toHaveLength(100);
    expect(mockFetchTokenAssets.mock.calls[1][0]).toHaveLength(1);

    const results = await Promise.all(promises);

    expect(results).toHaveLength(101);
    expect(results.every((r) => r?.resultType === 'Benign')).toBe(true);
  });
});

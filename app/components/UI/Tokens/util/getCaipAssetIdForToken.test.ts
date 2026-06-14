import type { CaipAssetType } from '@metamask/utils';

import type { TokenI } from '../types';

import {
  getCaipAssetIdForToken,
  getNativeAssetId,
} from './getCaipAssetIdForToken';

/** Lower-case reference; runtime id uses checksummed hex from bridge formatter. */
const ERC20_CAIP_LOWER =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

/** Distinct hex chain used with `getNativeAssetId` for stable native-ID expectations. */
const OBSCURE_EVM_HEX = '0xffffff';

function minimalToken(partial: Partial<TokenI>): TokenI {
  return {
    address: '0x0000000000000000000000000000000000000001',
    decimals: 18,
    image: '',
    name: '',
    symbol: '',
    balance: '0',
    logo: undefined,
    isETH: false,
    chainId: '0x1',
    ...partial,
  } as TokenI;
}

describe('getCaipAssetIdForToken', () => {
  it.each([
    {
      caseDescription: 'asset is null',
      asset: null as TokenI | null | undefined,
    },
    {
      caseDescription: 'asset is undefined',
      asset: undefined as TokenI | null | undefined,
    },
    {
      caseDescription: 'asset has no chainId',
      asset: minimalToken({ chainId: undefined }),
    },
    {
      caseDescription: 'non-native token has empty address',
      asset: minimalToken({
        address: '',
        isNative: false,
        isETH: false,
      }),
    },
    {
      caseDescription: 'token address is not valid hex',
      asset: minimalToken({
        address: 'not-a-valid-token-address',
        isNative: false,
        isETH: false,
      }),
    },
  ])('returns null when $caseDescription', async ({ asset }) => {
    const result = await getCaipAssetIdForToken(asset);

    expect(result).toBeNull();
  });

  it('returns the address when it is already a CAIP asset id', async () => {
    const asset = minimalToken({
      address: ERC20_CAIP_LOWER,
      isNative: false,
      isETH: false,
    });

    const result = await getCaipAssetIdForToken(asset);

    expect(result).toBe(ERC20_CAIP_LOWER);
  });

  it.each([
    {
      caseDescription: 'isNative is true',
      tokenOverrides: { isNative: true, isETH: false },
    },
    {
      caseDescription: 'isETH is true',
      tokenOverrides: { isNative: false, isETH: true },
    },
  ])(
    'returns native CAIP from getNativeAssetId when $caseDescription',
    async ({ tokenOverrides }) => {
      const expected = (await getNativeAssetId(
        OBSCURE_EVM_HEX as `0x${string}`,
      )) as CaipAssetType;

      const asset = minimalToken({
        chainId: OBSCURE_EVM_HEX,
        ...tokenOverrides,
      });

      const result = await getCaipAssetIdForToken(asset);

      expect(result).toBe(expected);
    },
  );
  it.each([
    {
      caseDescription: '40-char hex without 0x prefix',
      address: 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    {
      caseDescription: 'prefixed erc-20 hex address',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
  ])(
    'returns CAIP asset id normalized from $caseDescription',
    async ({ address }) => {
      const asset = minimalToken({
        chainId: '0x1',
        address,
        isNative: false,
        isETH: false,
      });

      const result = await getCaipAssetIdForToken(asset);

      expect(result?.toLowerCase()).toStrictEqual(
        ERC20_CAIP_LOWER.toLowerCase(),
      );
    },
  );
});

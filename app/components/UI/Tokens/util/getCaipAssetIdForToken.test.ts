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
  it('returns null when asset is null', async () => {
    const result = await getCaipAssetIdForToken(null);

    expect(result).toBeNull();
  });

  it('returns null when asset is undefined', async () => {
    const result = await getCaipAssetIdForToken(undefined);

    expect(result).toBeNull();
  });

  it('returns null when asset has no chainId', async () => {
    const result = await getCaipAssetIdForToken(
      minimalToken({ chainId: undefined }),
    );

    expect(result).toBeNull();
  });

  it('returns the address when it is already a CAIP asset id', async () => {
    const result = await getCaipAssetIdForToken(
      minimalToken({
        address: ERC20_CAIP_LOWER,
        isNative: false,
        isETH: false,
      }),
    );

    expect(result).toBe(ERC20_CAIP_LOWER);
  });

  it('returns native CAIP from getNativeAssetId when isNative is true', async () => {
    const expected = (await getNativeAssetId(
      OBSCURE_EVM_HEX as `0x${string}`,
    )) as CaipAssetType;

    const result = await getCaipAssetIdForToken(
      minimalToken({
        chainId: OBSCURE_EVM_HEX,
        isNative: true,
        isETH: false,
      }),
    );

    expect(result).toBe(expected);
  });

  it('returns native CAIP from getNativeAssetId when isETH is true', async () => {
    const expected = (await getNativeAssetId(
      OBSCURE_EVM_HEX as `0x${string}`,
    )) as CaipAssetType;

    const result = await getCaipAssetIdForToken(
      minimalToken({
        chainId: OBSCURE_EVM_HEX,
        isNative: false,
        isETH: true,
      }),
    );

    expect(result).toBe(expected);
  });

  it('returns null for a non-native token with no address', async () => {
    const result = await getCaipAssetIdForToken(
      minimalToken({
        address: '',
        isNative: false,
        isETH: false,
      }),
    );

    expect(result).toBeNull();
  });

  it('returns null when the token address is not valid hex', async () => {
    const result = await getCaipAssetIdForToken(
      minimalToken({
        address: 'not-a-valid-token-address',
        isNative: false,
        isETH: false,
      }),
    );

    expect(result).toBeNull();
  });

  it('returns the CAIP asset id for 40-char hex without 0x (normalized and checksummed)', async () => {
    const raw40 = 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const result = await getCaipAssetIdForToken(
      minimalToken({
        chainId: '0x1',
        address: raw40,
        isNative: false,
        isETH: false,
      }),
    );

    expect(result?.toLowerCase()).toBe(ERC20_CAIP_LOWER);
  });

  it('returns the formatted asset id for a valid erc-20 hex address', async () => {
    const result = await getCaipAssetIdForToken(
      minimalToken({
        chainId: '0x1',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        isNative: false,
        isETH: false,
      }),
    );

    expect(result?.toLowerCase()).toBe(ERC20_CAIP_LOWER);
  });
});

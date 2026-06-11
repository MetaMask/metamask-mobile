import type { TokenBalancesControllerState } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import {
  ARC_CHAIN_ID,
  ARC_NATIVE_TOKEN_ADDRESS,
  filterOutArcNativeAsset,
  isArcNativeAsset,
  omitArcNativeTokenBalances,
  shouldHideArc,
} from './arc';

const ACCOUNT = '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab' as Hex;
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as Hex;

describe('isArcNativeAsset', () => {
  it('returns true for the Arc native token', () => {
    expect(isArcNativeAsset({ chainId: ARC_CHAIN_ID, isNative: true })).toBe(
      true,
    );
  });

  it('matches the Arc chain id case-insensitively', () => {
    expect(
      isArcNativeAsset({ chainId: ARC_CHAIN_ID.toUpperCase(), isNative: true }),
    ).toBe(true);
  });

  it('returns false for the Arc USDC ERC20 (non-native)', () => {
    expect(isArcNativeAsset({ chainId: ARC_CHAIN_ID, isNative: false })).toBe(
      false,
    );
  });

  it('returns false for native tokens on other chains', () => {
    expect(isArcNativeAsset({ chainId: '0x1', isNative: true })).toBe(false);
  });

  it('returns false when fields are missing', () => {
    expect(isArcNativeAsset({})).toBe(false);
  });
});

describe('filterOutArcNativeAsset', () => {
  it('removes the Arc native token but keeps every other asset', () => {
    const assets = [
      { chainId: ARC_CHAIN_ID, isNative: true, symbol: 'ARC' },
      { chainId: ARC_CHAIN_ID, isNative: false, symbol: 'USDC' },
      { chainId: '0x1', isNative: true, symbol: 'ETH' },
    ];

    expect(filterOutArcNativeAsset(assets)).toEqual([
      { chainId: ARC_CHAIN_ID, isNative: false, symbol: 'USDC' },
      { chainId: '0x1', isNative: true, symbol: 'ETH' },
    ]);
  });

  it('returns an equivalent list when there is no Arc native token', () => {
    const assets = [{ chainId: '0x1', isNative: true, symbol: 'ETH' }];

    expect(filterOutArcNativeAsset(assets)).toEqual(assets);
  });
});

describe('shouldHideArc', () => {
  it('returns true for the Arc chain id', () => {
    expect(shouldHideArc(ARC_CHAIN_ID)).toBe(true);
  });

  it('matches the Arc chain id case-insensitively', () => {
    expect(shouldHideArc(ARC_CHAIN_ID.toUpperCase())).toBe(true);
  });

  it('returns false for other chains', () => {
    expect(shouldHideArc('0x1')).toBe(false);
  });

  it('returns false when the chain id is missing', () => {
    expect(shouldHideArc()).toBe(false);
  });
});

describe('omitArcNativeTokenBalances', () => {
  it('removes the Arc native (zero address) balance but keeps other tokens', () => {
    const tokenBalances = {
      [ACCOUNT]: {
        [ARC_CHAIN_ID]: {
          [ARC_NATIVE_TOKEN_ADDRESS]: '0x5' as Hex,
          [USDC_ADDRESS]: '0xa' as Hex,
        },
      },
    } as TokenBalancesControllerState['tokenBalances'];

    const result = omitArcNativeTokenBalances(tokenBalances);

    expect(
      result[ACCOUNT][ARC_CHAIN_ID][ARC_NATIVE_TOKEN_ADDRESS],
    ).toBeUndefined();
    expect(result[ACCOUNT][ARC_CHAIN_ID][USDC_ADDRESS]).toBe('0xa');
  });

  it('does not touch the native balance on non-Arc chains', () => {
    const tokenBalances = {
      [ACCOUNT]: {
        '0x1': {
          [ARC_NATIVE_TOKEN_ADDRESS]: '0x5' as Hex,
        },
      },
    } as TokenBalancesControllerState['tokenBalances'];

    const result = omitArcNativeTokenBalances(tokenBalances);

    expect(result).toBe(tokenBalances);
    expect(result[ACCOUNT]['0x1'][ARC_NATIVE_TOKEN_ADDRESS]).toBe('0x5');
  });

  it('returns the same reference when there is nothing to strip', () => {
    const tokenBalances = {
      [ACCOUNT]: {
        [ARC_CHAIN_ID]: {
          [USDC_ADDRESS]: '0xa' as Hex,
        },
      },
    } as TokenBalancesControllerState['tokenBalances'];

    expect(omitArcNativeTokenBalances(tokenBalances)).toBe(tokenBalances);
  });
});

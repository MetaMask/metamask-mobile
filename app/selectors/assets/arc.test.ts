import type {
  AccountGroupAssets,
  Asset,
  AssetsByAccountGroup,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
import type { AccountGroupId } from '@metamask/account-api';
import type { Hex } from '@metamask/utils';
import {
  ARC_CHAIN_ID,
  ARC_NATIVE_TOKEN_ADDRESS,
  omitArcNativeFromAccountGroupAssets,
  omitArcNativeFromAllAssets,
  omitArcNativeTokenBalances,
} from './arc';

const ACCOUNT = '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab' as Hex;
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as Hex;
const GROUP_ID = 'entropy:01ABC/0' as AccountGroupId;

const makeAsset = (overrides: Partial<Asset>): Asset =>
  ({
    accountType: 'eip155:eoa',
    accountId: 'account-1',
    assetId: USDC_ADDRESS,
    address: USDC_ADDRESS,
    chainId: ARC_CHAIN_ID,
    image: '',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
    isNative: false,
    rawBalance: '0x0',
    balance: '0',
    fiat: undefined,
    ...overrides,
  }) as Asset;

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

describe('omitArcNativeFromAccountGroupAssets', () => {
  it('removes the native Arc asset but keeps the Arc USDC asset', () => {
    const assets: AccountGroupAssets = {
      [ARC_CHAIN_ID]: [
        makeAsset({ isNative: true, assetId: ARC_NATIVE_TOKEN_ADDRESS }),
        makeAsset({ isNative: false }),
      ],
    };

    const result = omitArcNativeFromAccountGroupAssets(assets);

    expect(result[ARC_CHAIN_ID]).toHaveLength(1);
    expect(result[ARC_CHAIN_ID][0].isNative).toBe(false);
  });

  it('does not affect native tokens on other chains', () => {
    const assets: AccountGroupAssets = {
      '0x1': [makeAsset({ chainId: '0x1', isNative: true })],
    };

    const result = omitArcNativeFromAccountGroupAssets(assets);

    expect(result).toBe(assets);
    expect(result['0x1']).toHaveLength(1);
  });

  it('returns the same reference when there is no Arc native asset', () => {
    const assets: AccountGroupAssets = {
      [ARC_CHAIN_ID]: [makeAsset({ isNative: false })],
    };

    expect(omitArcNativeFromAccountGroupAssets(assets)).toBe(assets);
  });
});

describe('omitArcNativeFromAllAssets', () => {
  it('strips the native Arc asset from each account group', () => {
    const grouped: AssetsByAccountGroup = {
      [GROUP_ID]: {
        [ARC_CHAIN_ID]: [
          makeAsset({ isNative: true, assetId: ARC_NATIVE_TOKEN_ADDRESS }),
          makeAsset({ isNative: false }),
        ],
      },
    };

    const result = omitArcNativeFromAllAssets(grouped);

    expect(result[GROUP_ID][ARC_CHAIN_ID]).toHaveLength(1);
    expect(result[GROUP_ID][ARC_CHAIN_ID][0].isNative).toBe(false);
  });

  it('returns the same reference when nothing changes', () => {
    const grouped: AssetsByAccountGroup = {
      [GROUP_ID]: {
        [ARC_CHAIN_ID]: [makeAsset({ isNative: false })],
      },
    };

    expect(omitArcNativeFromAllAssets(grouped)).toBe(grouped);
  });
});

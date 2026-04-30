import type { CaipAssetType } from '@metamask/utils';

import { tokenListSecurityBadgeKeys } from './tokenSecurityBadgeKeys';

const ERC20_ETHEREUM_USDC =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

const ERC20_ETHEREUM_DAI =
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f' as CaipAssetType;

describe('tokenListSecurityBadgeKeys', () => {
  it('returns a stable root key tuple from all', () => {
    const root = tokenListSecurityBadgeKeys.all();

    expect(root).toEqual(['tokenList', 'securityBadge']);
    expect(tokenListSecurityBadgeKeys.all()).toStrictEqual(root);
  });

  it('returns a tuple where byAsset prefixes all and ends with the given caip id', () => {
    const key = tokenListSecurityBadgeKeys.byAsset(ERC20_ETHEREUM_USDC);

    expect(key).toEqual([
      ...tokenListSecurityBadgeKeys.all(),
      ERC20_ETHEREUM_USDC,
    ]);
    expect(key).toHaveLength(3);
  });

  it('uses distinct keys for distinct caip asset ids', () => {
    expect(tokenListSecurityBadgeKeys.byAsset(ERC20_ETHEREUM_USDC)).not.toEqual(
      tokenListSecurityBadgeKeys.byAsset(ERC20_ETHEREUM_DAI),
    );
  });

  it('returns referentially predictable structure for identical id arguments', () => {
    expect(tokenListSecurityBadgeKeys.byAsset(ERC20_ETHEREUM_USDC)).toEqual(
      tokenListSecurityBadgeKeys.byAsset(ERC20_ETHEREUM_USDC),
    );
  });
});

import type { CaipAssetType } from '@metamask/utils';

import { tokenListSecurityBadgeKeys } from './tokenSecurityBadgeKeys';

const ERC20_ETHEREUM_USDC =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

const ERC20_ETHEREUM_USDC_CHECKSUMMED =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as CaipAssetType;

const ERC20_ETHEREUM_DAI =
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f' as CaipAssetType;

const NATIVE_ETHEREUM = 'eip155:1/slip44:60' as CaipAssetType;

const SOLANA_BONK =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' as CaipAssetType;

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

  // The token list checksums the ERC-20 address before building its asset id
  // while Token Details does not, so both spellings have to land on one entry.
  it('resolves checksummed and lowercase erc20 ids to the same key', () => {
    expect(
      tokenListSecurityBadgeKeys.byAsset(ERC20_ETHEREUM_USDC_CHECKSUMMED),
    ).toEqual(tokenListSecurityBadgeKeys.byAsset(ERC20_ETHEREUM_USDC));
  });

  it('lowercases the erc20 asset reference in the key', () => {
    const key = tokenListSecurityBadgeKeys.byAsset(
      ERC20_ETHEREUM_USDC_CHECKSUMMED,
    );

    expect(key[2]).toBe(ERC20_ETHEREUM_USDC);
  });

  it.each([
    ['native', NATIVE_ETHEREUM],
    ['solana token', SOLANA_BONK],
  ])('passes a %s asset id through unchanged', (_label, assetId) => {
    expect(tokenListSecurityBadgeKeys.byAsset(assetId)[2]).toBe(assetId);
  });

  it('caipFromToken prefixes all and includes token identity fields', () => {
    const key = tokenListSecurityBadgeKeys.caipFromToken({
      chainId: '0x1',
      address: '0xabc',
      isNative: false,
      isETH: false,
    });

    expect(key).toEqual([
      'tokenList',
      'securityBadge',
      'caipFromToken',
      '0x1',
      '0xabc',
      false,
      false,
    ]);
    expect(key).toHaveLength(7);
    expect(key[0]).toBe(tokenListSecurityBadgeKeys.all()[0]);
    expect(key[1]).toBe(tokenListSecurityBadgeKeys.all()[1]);
  });
});

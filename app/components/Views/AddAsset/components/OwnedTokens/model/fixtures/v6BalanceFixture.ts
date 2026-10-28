import type { OwnedTokenBalanceItem } from '../types';

/**
 * Recorded Accounts API v6 balances used to pin the `balance` unit.
 *
 * Source request (2026-10-28), public account, Ethereum mainnet only:
 * GET https://accounts.api.cx.metamask.io/v6/multiaccount/balances?accountIds=eip155:1:0xd8da6bf26964af9d7eed9e03e53415d37aa96045&networks=eip155:1&filterSupportedTokens=false&includeDeFiBalances=false&includePrices=true&includeLabels=true&includeCanonicalHead=true&vsCurrency=usd
 * Client headers: x-metamask-clientproduct=metamask-mobile
 *
 * Contract: `@metamask/core-backend@12.3.0` `V6BalanceItem.balance` is
 * `string` and does not document the unit. Stellar metadata fields on the
 * same type are explicitly "unscaled stroops"; `balance` is not.
 *
 * The live body had 2891 token rows and every `balance` contained a decimal
 * point. ETH (18 decimals) was `5.777859622599202671`. USDC (6 decimals) was
 * `38.192124`. Those are readable token amounts, not minimal units: dividing
 * USDC by 10^6 would turn a ~$38 balance into dust. WETH carried
 * `canonicalHead: eip155:1/slip44:60`.
 */
export const V6_RECORDED_BALANCE_ROWS: readonly OwnedTokenBalanceItem[] = [
  {
    accountId: 'eip155:1:0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    object: 'token',
    type: 'native',
    assetId: 'eip155:1/slip44:60',
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    balance: '5.777859622599202671',
    securityResultType: 'Verified',
    price: '2372.325666594368',
  },
  {
    accountId: 'eip155:1:0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    object: 'token',
    type: 'erc20',
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    balance: '38.192124',
    price: '0.999382',
    labels: ['stable_coin', 'badges:v1:stablecoin'],
    securityResultType: 'Verified',
  },
  {
    accountId: 'eip155:1:0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    object: 'token',
    type: 'erc20',
    assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    balance: '14.372082162212001768',
    price: '1.000091421850075',
    labels: ['stable_coin', 'badges:v1:stablecoin'],
    securityResultType: 'Verified',
  },
  {
    accountId: 'eip155:1:0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    object: 'token',
    type: 'erc20',
    assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    balance: '1.466528037085158070',
    price: '2372.325666594368',
    labels: ['blue_chip'],
    canonicalHead: 'eip155:1/slip44:60',
    securityResultType: 'Verified',
  },
];

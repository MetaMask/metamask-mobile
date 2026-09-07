import type { TokenHolding } from '../../../framework/fixtures/mmpay-token-holdings-registry.js';

const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Seeds Anvil (`0x539` / CAIP `eip155:1337`) native ETH into both legacy
 * balance controllers and unified AssetsController state via
 * `FixtureBuilder.withTokenHoldings`. Required when `assetsUnifyState` is ON
 * so confirmation Confirm stays enabled (non-empty pay / gas balance).
 */
export const ANVIL_LOCAL_ETH_HOLDING: TokenHolding = {
  symbol: 'ETH',
  address: NATIVE_ADDRESS,
  decimals: 18,
  chainId: '0x539',
  isNative: true,
  usdValue: 1,
  amount: '100',
};

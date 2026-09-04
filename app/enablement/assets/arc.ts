import { type AssetsControllerState } from '@metamask/assets-controller';
import { BridgeToken } from '../../components/UI/Bridge/types';
import { Hex } from '@metamask/utils';
import { STABLE_USDT0_ERC20_ADDRESS } from './networks-customization';

export const ARC_HEX_CHAIN_ID: Hex = '0x13b2';
export const ARC_CAIP_CHAIN_ID = 'eip155:5042';
export const ARC_USDC_ERC20_ADDRESS =
  '0x3600000000000000000000000000000000000000';

export const ARC_USDC_BRIDGE_TOKEN = {
  symbol: 'USDC',
  name: 'USDC',
  address: ARC_USDC_ERC20_ADDRESS,
  chainId: ARC_HEX_CHAIN_ID,
  decimals: 6, // ERC20, hence 6 decimals
};

/**
 * CAIP-19 ERC-20 asset ids that duplicate native gas tokens. Stripped on the
 * unified aggregation path so fiat totals match the legacy
 * `filterExcludedTokenBalances` behavior. Stable USDT0 uses the same pattern
 * and is included here until enablement is split further.
 */
const EXCLUDED_UNIFIED_BALANCE_ASSET_IDS = new Set([
  `${ARC_CAIP_CHAIN_ID}/erc20:${ARC_USDC_ERC20_ADDRESS.toLowerCase()}`,
  `eip155:988/erc20:${STABLE_USDT0_ERC20_ADDRESS.toLowerCase()}`,
]);

/**
 * Removes ERC-20 balances that duplicate native gas tokens (Arc USDC, Stable
 * USDT0) from AssetsController state used for unified fiat aggregation.
 *
 * @param assetsControllerState - AssetsController state slice.
 * @returns Copy of state without excluded ERC-20 balances.
 */
export function augmentArcExcludedAssets(
  assetsControllerState: AssetsControllerState,
): AssetsControllerState {
  return {
    ...assetsControllerState,
    assetsBalance: Object.fromEntries(
      Object.entries(assetsControllerState.assetsBalance ?? {}).map(
        ([accountId, assets]) => [
          accountId,
          Object.fromEntries(
            Object.entries(assets).filter(
              ([assetId]) =>
                !EXCLUDED_UNIFIED_BALANCE_ASSET_IDS.has(assetId.toLowerCase()),
            ),
          ),
        ],
      ),
    ),
  };
}

/**
 * Checks if token is the ERC20 USDC on Arc chain.
 * @param token
 * @returns true if bridge token corresponds to the ERC20 version of USDC on Arc
 */
export function isArcTokenUSDC(token: BridgeToken) {
  return (
    [ARC_HEX_CHAIN_ID, ARC_CAIP_CHAIN_ID].includes(token.chainId) &&
    token.address === ARC_USDC_ERC20_ADDRESS
  );
}

import { BridgeToken } from '../../components/UI/Bridge/types';
import { Hex } from '@metamask/utils';
import type { AssetsControllerState } from '@metamask/assets-controller';

export const ARC_HEX_CHAIN_ID: Hex = '0x13b2';
export const ARC_CAIP_CHAIN_ID = 'eip155:5042';
export const ARC_USDC_ERC20_ADDRESS =
  '0x3600000000000000000000000000000000000000';
export const ARC_ERC20_USDC_ASSET_ID =
  `eip155:5042/erc20:${ARC_USDC_ERC20_ADDRESS}` as const;

export const ARC_USDC_BRIDGE_TOKEN = {
  symbol: 'USDC',
  name: 'USDC',
  address: ARC_USDC_ERC20_ADDRESS,
  chainId: ARC_HEX_CHAIN_ID,
  decimals: 6, // ERC20, hence 6 decimals
};

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

/**
 * Augments AssetsController state for Arc-related concerns.
 * Removes ERC20 USDC balances to avoid double counting in the fiat total
 * (native Arc USDC is the source of truth).
 *
 * @param assetsControllerState - AssetsController state slice.
 * @returns Copy of state without Arc ERC20 USDC balances.
 */
export function augmentAssetControllersState(
  assetsControllerState: AssetsControllerState,
): AssetsControllerState {
  return {
    ...assetsControllerState,
    assetsBalance: Object.fromEntries(
      Object.entries(assetsControllerState.assetsBalance ?? {}).map(
        ([accountId, assets]) => {
          const { [ARC_ERC20_USDC_ASSET_ID]: _omit, ...rest } = assets;
          return [accountId, rest];
        },
      ),
    ),
  };
}

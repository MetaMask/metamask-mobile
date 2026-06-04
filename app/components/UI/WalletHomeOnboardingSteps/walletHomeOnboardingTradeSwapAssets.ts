import { CHAIN_IDS } from '@metamask/transaction-controller';
import { EthScope } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { toChecksumAddress } from '../../../util/address';
import { Bip44TokensForDefaultPairs } from '../Bridge/constants/default-swap-dest-tokens';
import { getNativeSourceToken } from '../Bridge/utils/tokenUtils';
import type { BridgeToken } from '../Bridge/types';

/** Native ETH placeholder address used in token balance lookups on EVM chains. */
export const MAINNET_NATIVE_ETH_TOKEN_ADDRESS: Hex =
  '0x0000000000000000000000000000000000000000';

/** Mainnet mUSD contract address (TMCU-681 trade-step swap defaults). */
export const MAINNET_MUSD_TOKEN_ADDRESS: Hex =
  '0xaca92e438df0b2401ff60da7e4337b687a2435da';

/** TokenBalancesController keys are checksummed (see assets-migration). */
export const MAINNET_MUSD_TOKEN_BALANCE_LOOKUP_ADDRESS = toChecksumAddress(
  MAINNET_MUSD_TOKEN_ADDRESS,
) as Hex;

const MAINNET_BTC_CAIP_ASSET_ID =
  'bip122:000000000019d6689c085ae165831e93/slip44:0' as const;

const MAINNET_MUSD_BRIDGE_TOKEN: BridgeToken = {
  address: MAINNET_MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MAINNET,
  symbol: 'mUSD',
  name: 'MetaMask USD',
  decimals: 6,
  image:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
};

export function getMainnetMusdBridgeToken(): BridgeToken {
  return MAINNET_MUSD_BRIDGE_TOKEN;
}

const MAINNET_ETH_BRIDGE_TOKEN: BridgeToken = getNativeSourceToken(
  EthScope.Mainnet,
);

export function getMainnetEthBridgeToken(): BridgeToken {
  return MAINNET_ETH_BRIDGE_TOKEN;
}

export function getMainnetBtcBridgeToken(): BridgeToken {
  return Bip44TokensForDefaultPairs[MAINNET_BTC_CAIP_ASSET_ID];
}

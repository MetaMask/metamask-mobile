import { Hex } from '@metamask/utils';

export const ARC_HEX_CHAIN_ID: Hex = '0x13b2';
export const ARC_USDC_ERC20_ADDRESS =
  '0x3600000000000000000000000000000000000000';

export const ARC_USDC_BRIDGE_TOKEN = {
  symbol: 'USDC',
  name: 'USDC',
  address: ARC_USDC_ERC20_ADDRESS,
  chainId: ARC_HEX_CHAIN_ID,
  decimals: 6, // ERC20, hence 6 decimals
};

import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import { TokenI } from '../../../../UI/Tokens/types';

/**
 * Linea mUSD token reference for Merkl bonus claim (claim executes on Linea).
 */
export const LINEA_MUSD_ASSET_FOR_MERKL: TokenI = {
  chainId: CHAIN_IDS.LINEA_MAINNET as string,
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol,
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  image: '',
  balance: '0',
  isETH: false,
  logo: undefined,
};

/**
 * mUSD token icon URL from MetaMask static CDN (matches popular tokens list).
 */
const MUSD_MAINNET_ICON_URL = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${MUSD_TOKEN_ADDRESS}.png`;

/**
 * Minimal asset shape for navigating to Asset Details (Mainnet mUSD).
 * AssetDetailsContainer can create a token from this when not in portfolio.
 */
export const MUSD_MAINNET_ASSET_FOR_DETAILS: TokenI = {
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol,
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  image: MUSD_MAINNET_ICON_URL,
  balance: '0',
  logo: MUSD_MAINNET_ICON_URL,
  isETH: false,
  chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
};

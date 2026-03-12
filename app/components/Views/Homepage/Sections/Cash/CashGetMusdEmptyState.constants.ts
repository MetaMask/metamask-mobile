import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import { TokenI } from '../../../../UI/Tokens/types';

/**
 * Minimal asset shape for navigating to Asset Details (Mainnet mUSD).
 * AssetDetailsContainer can create a token from this when not in portfolio.
 */
export const MUSD_MAINNET_ASSET_FOR_DETAILS: TokenI = {
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol,
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  image: '',
  balance: '0',
  logo: undefined,
  isETH: false,
  chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
};

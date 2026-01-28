import { KeyringAccountType } from '@metamask/keyring-api';
import { TokenRwaData } from '@metamask/assets-controllers';

export interface BrowserTab {
  id: string;
  url: string;
}

export interface TokenI {
  address: string;
  aggregators?: string[];
  decimals: number;
  image: string;
  name: string;
  symbol: string;
  balance: string;
  balanceFiat?: string;
  logo: string | undefined;
  isETH: boolean | undefined;
  hasBalanceError?: boolean;
  isStaked?: boolean | undefined;
  nativeAsset?: TokenI | undefined;
  chainId?: string;
  isNative?: boolean;
  ticker?: string;
  accountType?: KeyringAccountType;
  pricePercentChange1d?: number;
  rwaData?: TokenRwaData;
}

import { Hex } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  balanceToFiatNumber,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  weiToFiatNumber,
} from '../../../../util/number';
import { isSwapsNativeAsset } from '../../../../util/bridge';

export interface Token {
  address: string;
  aggregators: string[];
  blocked: boolean;
  decimals: number;
  iconUrl: string;
  name: string;
  occurrences: number;
  symbol: string;
  type: string;
}

export type TokenWithFiatValue = Token & {
  balance: string | undefined;
  balanceFiat: string | undefined;
};

export interface Account {
  balance: Hex;
}

export interface TokenExchangeRate {
  tokenAddress: string;
  currency: string;
  id: string;
  price: number;
  marketCap: number;
  allTimeHigh: number;
  allTimeLow: number;
  totalVolume: number;
  high1d: number;
  low1d: number;
  circulatingSupply: number;
  dilutedMarketCap: number;
  marketCapPercentChange1d: number;
  priceChange1d: number;
  pricePercentChange1h: number;
  pricePercentChange1d: number;
  pricePercentChange7d: number;
  pricePercentChange14d: number;
  pricePercentChange30d: number;
  pricePercentChange200d: number;
  pricePercentChange1y: number;
}
export type TokenExchangeRates = Record<string, TokenExchangeRate>;

export type Balances = Record<string, Hex>; // token address -> atomic hex balance

export const getFiatValue = ({
  token,
  account,
  tokenExchangeRates,
  balances,
  conversionRate,
  currencyCode,
}: {
  token: Token;
  account?: Account;
  tokenExchangeRates: TokenExchangeRates;
  balances: Balances;
  conversionRate: number;
  currencyCode: string;
}) => {
  const tokenAddress = safeToChecksumAddress(token.address);

  if (isSwapsNativeAsset(token)) {
    const balance = account ? renderFromWei(account.balance) : undefined;
    const balanceFiat = account
      ? weiToFiatNumber(
          hexToBN(account.balance),
          conversionRate,
          (currencyCode === 'usd' && 2) || undefined,
        ).toString()
      : undefined;
    return { balance, balanceFiat };
  }

  const exchangeRate =
    tokenExchangeRates && tokenAddress && tokenAddress in tokenExchangeRates
      ? tokenExchangeRates[tokenAddress]?.price
      : undefined;
  const balance =
    tokenAddress && tokenAddress in balances
      ? renderFromTokenMinimalUnit(balances[tokenAddress], token.decimals)
      : '0';
  const balanceFiat = exchangeRate
    ? balanceToFiatNumber(balance, conversionRate, exchangeRate).toString()
    : undefined;
  return { balance, balanceFiat };
};

export const getTokenWithFiatValue = ({
  token,
  account,
  tokenExchangeRates,
  balances,
  conversionRate,
  currencyCode,
}: {
  token: Token;
  account: Account;
  tokenExchangeRates: TokenExchangeRates;
  balances: Balances;
  conversionRate: number;
  currencyCode: string;
}): TokenWithFiatValue => {
  const { balance, balanceFiat } = getFiatValue({
    token,
    account,
    tokenExchangeRates,
    balances,
    conversionRate,
    currencyCode,
  });
  return { ...token, balance, balanceFiat };
};

export const getSortedTokensByFiatValue = ({
  tokens,
  account,
  tokenExchangeRates,
  balances,
  conversionRate,
  currencyCode,
}: {
  tokens: Token[];
  account: Account;
  tokenExchangeRates: TokenExchangeRates;
  balances: Balances;
  conversionRate: number;
  currencyCode: string;
}) =>
  tokens
    .map((token) =>
      getTokenWithFiatValue({
        token,
        account,
        tokenExchangeRates,
        balances,
        conversionRate,
        currencyCode,
      }),
    )
    .sort((a, b) => {
      const bFiat = Number(b.balanceFiat ?? 0);
      const aFiat = Number(a.balanceFiat ?? 0);
      return bFiat - aFiat;
    });

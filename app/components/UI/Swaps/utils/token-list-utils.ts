import { Hex } from '@metamask/utils';
import { isSwapsNativeAsset } from '.';
import { safeToChecksumAddress } from '../../../../util/address';
import { balanceToFiatNumber, hexToBN, renderFromTokenMinimalUnit, renderFromWei, weiToFiatNumber } from '../../../../util/number';

interface Token {
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

type TokenWithFiatValue = Token & {
  balance: string | undefined;
  balanceFiat: string | undefined;
};

interface Account {
  balance: Hex;
}

interface TokenExchangeRate {
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
type TokenExchangeRates = Record<string, TokenExchangeRate>;

type Balances = Record<string, Hex>; // token address -> atomic hex balance

export const getFiatValue = ({
  token,
  account,
  tokenExchangeRates,
  balances,
  conversionRate,
}: {
  token: Token;
  account: Account;
  tokenExchangeRates: TokenExchangeRates;
  balances: Balances;
  conversionRate: number;
}) => {
  const tokenAddress = safeToChecksumAddress(token.address);

  if (isSwapsNativeAsset(token)) {
    const balance = renderFromWei(
      account?.balance,
    );
    const balanceFiat = weiToFiatNumber(
      hexToBN(account.balance),
      conversionRate,
    ).toString();
    return { balance, balanceFiat };
  }

  const exchangeRate =
    tokenExchangeRates && tokenAddress &&  tokenAddress in tokenExchangeRates
      ? tokenExchangeRates[tokenAddress]?.price
      : undefined;
  const balance =
    tokenAddress && tokenAddress in balances
      ? renderFromTokenMinimalUnit(balances[tokenAddress], token.decimals)
      : '0';
  const balanceFiat = exchangeRate
    ? balanceToFiatNumber(
        balance,
        conversionRate,
        exchangeRate,
      ).toString()
    : undefined;
  return { balance, balanceFiat };
};

export const getTokenWithFiatValue = ({
  token,
  account,
  tokenExchangeRates,
  balances,
  conversionRate,
}: {
  token: Token;
  account: Account;
  tokenExchangeRates: TokenExchangeRates;
  balances: Balances;
  conversionRate: number;
}): TokenWithFiatValue => {
  const { balance, balanceFiat } = getFiatValue({
    token,
    account,
    tokenExchangeRates,
    balances,
    conversionRate,
  });
  return { ...token, balance, balanceFiat };
};

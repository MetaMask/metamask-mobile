import { useSelector } from 'react-redux';
import { selectAllTokens } from '../../selectors/tokensController';
import { selectAllTokenBalances } from '../../selectors/tokenBalancesController';
import {
  balanceToFiatNumber,
  renderFromTokenMinimalUnit,
  toHexadecimal,
} from '../../util/number';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { selectTokenMarketData } from '../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../selectors/currencyRateController';
import { MarketDataDetails, Token } from '@metamask/assets-controllers';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isTestNet } from '../../util/networks';
import { selectShowFiatInTestnets } from '../../selectors/settings';

interface AllTokens {
  [chainId: string]: {
    [tokenAddress: string]: Token[];
  };
}

export interface TokensWithBalances {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  tokenBalanceFiat: number;
}

interface AddressMapping {
  [chainId: string]: {
    [tokenAddress: string]: string;
  };
}

interface TokenBalancesMapping {
  [address: string]: AddressMapping;
}

export interface MarketDataMapping {
  [chainId: string]: {
    [tokenAddress: string]: MarketDataDetails;
  };
}

export const useGetFormattedTokensPerChain = (
  accounts: InternalAccount[],
  shouldAggregateAcrossChains: boolean, // We don't always want to aggregate across chains.
  allChainIDs: string[],
): {
  [address: string]: {
    chainId: string;
    tokensWithBalances: TokensWithBalances[];
  }[];
} => {
  // TODO: [SOLANA] Revisit this before shipping, `selectAllTokenBalances` selector needs to most likely be replaced by a non evm supported version
  const currentChainId = useSelector(selectChainId);
  const importedTokens: AllTokens = useSelector(selectAllTokens);
  const allNetworks: Record<
    string,
    {
      name: string;
      nativeCurrency: string;
    }
  > = useSelector(selectNetworkConfigurations);
  const currentTokenBalances: TokenBalancesMapping = useSelector(
    selectAllTokenBalances,
  );

  const marketData: MarketDataMapping = useSelector(selectTokenMarketData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  //If the current network is a testnet, UI should display 0 unless conversions are enabled
  const validAccounts =
    accounts.length > 0 && accounts.every((item) => item !== undefined);
  if (!validAccounts || (isTestNet(currentChainId) && !showFiatOnTestnets)) {
    return {};
  }

  const networksToFormat = shouldAggregateAcrossChains
    ? allChainIDs
    : [currentChainId];

  const result: {
    [address: string]: {
      chainId: string;
      tokensWithBalances: TokensWithBalances[];
    }[];
  } = {};
  function getTokenFiatBalances({
    tokens,
    accountAddress,
    chainId,
    tokenExchangeRates,
    conversionRate,
    decimalsToShow,
  }: {
    tokens: Token[];
    accountAddress: string;
    chainId: string;
    tokenExchangeRates: {
      [tokenAddress: string]: MarketDataDetails;
    };
    conversionRate: number;
    decimalsToShow: number | undefined;
  }) {
    const formattedTokens = [];
    for (const token of tokens) {
      const hexBalance =
        currentTokenBalances[accountAddress]?.[chainId]?.[token.address] ??
        '0x0';

      const decimalBalance = renderFromTokenMinimalUnit(
        hexBalance,
        token.decimals,
      );
      const exchangeRate = tokenExchangeRates?.[token.address]?.price;

      const tokenBalanceFiat = balanceToFiatNumber(
        decimalBalance,
        conversionRate,
        exchangeRate,
        decimalsToShow,
      );

      formattedTokens.push({
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: decimalBalance,
        tokenBalanceFiat,
      });
    }
    return formattedTokens;
  }

  for (const account of accounts) {
    const formattedPerNetwork = [];
    for (const singleChain of networksToFormat) {
      const tokens: Token[] =
        importedTokens?.[singleChain]?.[account?.address] ?? [];
      const matchedChainSymbol = allNetworks[singleChain].nativeCurrency;
      const conversionRate =
        currencyRates?.[matchedChainSymbol]?.conversionRate ?? 0;
      const tokenExchangeRates = marketData?.[toHexadecimal(singleChain)];
      const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
      const tokensWithBalances = getTokenFiatBalances({
        tokens,
        accountAddress: account.address,
        chainId: singleChain,
        tokenExchangeRates,
        conversionRate,
        decimalsToShow,
      });
      formattedPerNetwork.push({
        chainId: singleChain,
        tokensWithBalances,
      });
    }
    result[account.address] = formattedPerNetwork;
  }

  return result;
};

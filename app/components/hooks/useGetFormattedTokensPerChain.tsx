import { useSelector } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';
import { MarketDataDetails, Token } from '@metamask/assets-controllers';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isEqual } from 'lodash';
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
import { selectTokenMarketPriceData } from '../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../selectors/currencyRateController';
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

/**
 * Ensures that a field is a stable reference.
 * For example a consumer of a hook could unintentionally pass in a hardcoded array:
 * ```
 * useGetFormattedTokensPerChain([internalAccount]) // BAD since it always is a new reference!
 * ```
 *
 * Using this allows the consumer of the hook to be a bit more flexible
 * ```
 * useGetFormattedTokensPerChain([internalAccount]) // This is okay now
 * ```
 * @param value - unstable property
 * @returns - stable property
 */
const useStableReference = <T,>(value: T) => {
  const [stableValue, setStableValue] = useState(value);

  useEffect(() => {
    if (!isEqual(stableValue, value)) {
      setStableValue(value);
    }
  }, [value, stableValue]);

  return stableValue;
};

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
  const stableAccounts = useStableReference(accounts);
  const stableAllChainIDs = useStableReference(allChainIDs);

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

  const marketData = useSelector(selectTokenMarketPriceData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  return useMemo(() => {
    //If the current network is a testnet, UI should display 0 unless conversions are enabled
    const validAccounts =
      stableAccounts.length > 0 &&
      stableAccounts.every((item) => item !== undefined);
    if (!validAccounts || (isTestNet(currentChainId) && !showFiatOnTestnets)) {
      return {};
    }

    const networksToFormat = shouldAggregateAcrossChains
      ? stableAllChainIDs
      : [currentChainId];

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
        [tokenAddress: string]: { price: number };
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

    const result: {
      [address: string]: {
        chainId: string;
        tokensWithBalances: TokensWithBalances[];
      }[];
    } = {};

    for (const account of stableAccounts) {
      const formattedPerNetwork = [];
      for (const singleChain of networksToFormat) {
        // Skip if the network configuration doesn't exist
        if (!allNetworks[singleChain]) {
          continue;
        }

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
  }, [
    stableAccounts,
    stableAllChainIDs,
    allNetworks,
    currentChainId,
    currentCurrency,
    currentTokenBalances,
    currencyRates,
    importedTokens,
    marketData,
    shouldAggregateAcrossChains,
    showFiatOnTestnets,
  ]);
};

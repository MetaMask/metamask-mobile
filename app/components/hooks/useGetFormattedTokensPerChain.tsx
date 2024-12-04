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
  selectConversionRateForAllChains,
  selectCurrentCurrency,
} from '../../selectors/currencyRateController';
import { MarketDataDetails, Token } from '@metamask/assets-controllers';
import { InternalAccount } from '@metamask/keyring-api';
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
  shouldGetTokensPerCurrentChain: boolean,
  allChainIDs: string[],
): {
  [address: string]: {
    chainId: string;
    tokensWithBalances: TokensWithBalances[];
  }[];
} => {
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
  const currencyRates = useSelector(selectConversionRateForAllChains);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  //If the current network is a testnet, UI should display 0 unless conversions are enabled

  const validAccounts =
    accounts.length > 0 && accounts.every((item) => item !== undefined);
  if (!validAccounts || (isTestNet(currentChainId) && !showFiatOnTestnets)) {
    return {};
  }

  const networksToFormat = shouldGetTokensPerCurrentChain
    ? [currentChainId]
    : allChainIDs;

  const result: {
    [address: string]: {
      chainId: string;
      tokensWithBalances: TokensWithBalances[];
    }[];
  } = {};
  accounts.forEach((account) => {
    const formattedPerNetwork = networksToFormat.map((singleChain) => {
      const tokens: Token[] =
        importedTokens?.[singleChain]?.[account?.address] ?? [];
      const matchedChainSymbol = allNetworks[singleChain].nativeCurrency;
      const conversionRate =
        currencyRates?.[matchedChainSymbol]?.conversionRate ?? 0;
      const tokenExchangeRates = marketData?.[toHexadecimal(singleChain)];
      const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
      const tokensWithBalances = tokens.reduce(
        (acc: TokensWithBalances[], token) => {
          const hexBalance =
            currentTokenBalances[account.address]?.[singleChain]?.[
              token.address
            ] ?? '0x0';

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

          acc.push({
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            balance: decimalBalance,
            tokenBalanceFiat,
          });

          return acc;
        },
        [],
      );
      return {
        chainId: singleChain,
        tokensWithBalances,
      };
    });
    result[account.address] = formattedPerNetwork;
  });

  return result;
};

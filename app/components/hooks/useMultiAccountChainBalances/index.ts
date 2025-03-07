// Third party dependencies
import { useSelector } from 'react-redux';
import { Token } from '@metamask/assets-controllers';
import { hexToBN, toChecksumHexAddress } from '@metamask/controller-utils';

// External dependencies
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { selectAllTokenBalances } from '../../../selectors/tokenBalancesController';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import { selectShowFiatInTestnets } from '../../../selectors/settings';
import {
  MarketDataMapping,
  TokenBalancesMapping,
  AllTokens,
} from '../../hooks/useGetFormattedTokensPerChain';
import {
  balanceToFiatNumber,
  renderFromTokenMinimalUnit,
  toHexadecimal,
  weiToFiatNumber,
} from '../../../util/number';
import { isTestNet } from '../../../util/networks';

// Internal dependencies
import { ChainFiatBalances } from './index.types';

/**
 * Hook to manage portfolio balance data across chains for all accounts.
 *
 * @returns Portfolio balance data for all accounts
 */
export const useMultiAccountChainBalances = (): ChainFiatBalances => {
  const allTokenBalances: TokenBalancesMapping = useSelector(
    selectAllTokenBalances,
  );
  const importedTokens: AllTokens = useSelector(selectAllTokens);
  const allNetworks: Record<
    string,
    {
      name: string;
      nativeCurrency: string;
    }
  > = useSelector(selectNetworkConfigurations);
  const marketData: MarketDataMapping = useSelector(selectTokenMarketData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  const result: ChainFiatBalances = {};
  for (const [accountAddress, tokenBalances] of Object.entries(
    allTokenBalances,
  )) {
    let currentChainId = '';

    result[accountAddress] = {};
    for (const [chainId, tokenBalance] of Object.entries(tokenBalances)) {
      if (isTestNet(chainId) && showFiatOnTestnets) {
        return {};
      }

      currentChainId = chainId;
      result[accountAddress][chainId] = {
        totalNativeFiatBalance: 0,
        totalImportedTokenFiatBalance: 0,
        totalFiatBalance: 0,
      };

      // Calculate the imported token balance
      const tokens: Token[] = importedTokens?.[chainId]?.[accountAddress] ?? [];
      const matchedChainSymbol = allNetworks[chainId].nativeCurrency;
      const conversionRate =
        currencyRates?.[matchedChainSymbol]?.conversionRate ?? 0;
      const tokenExchangeRates = marketData?.[toHexadecimal(chainId)];
      const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;

      for (const token of tokens) {
        const hexBalance = tokenBalance?.[token.address] ?? '0x0';

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

        result[accountAddress][chainId].totalImportedTokenFiatBalance +=
          tokenBalanceFiat;

        // Calculate the native token balance
        const balanceBN = hexToBN(
          accountsByChainId[toHexadecimal(chainId)][
            toChecksumHexAddress(accountAddress)
          ].balance,
        );

        const stakedBalanceBN = hexToBN(
          accountsByChainId[toHexadecimal(chainId)][
            toChecksumHexAddress(accountAddress)
          ].stakedBalance || '0x00',
        );
        const totalAccountBalance = balanceBN
          .add(stakedBalanceBN)
          .toString('hex');
        const ethFiat = weiToFiatNumber(
          totalAccountBalance,
          conversionRate,
          decimalsToShow,
        );

        result[accountAddress][chainId].totalNativeFiatBalance = ethFiat;
      }

      const currentChainNativeFiatBalance =
        result[accountAddress][currentChainId].totalNativeFiatBalance;
      const currentChainImportedTokenFiatBalance =
        result[accountAddress][currentChainId].totalImportedTokenFiatBalance;

      result[accountAddress][currentChainId].totalFiatBalance =
        currentChainNativeFiatBalance + currentChainImportedTokenFiatBalance;
    }
  }

  return result;
};

import { useSelector } from 'react-redux';
import { toHexadecimal, weiToFiatNumber } from '../../util/number';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { selectAccountsByChainId } from '../../selectors/accountTrackerController';
import { hexToBN, toChecksumHexAddress } from '@metamask/controller-utils';
import { TokensWithBalances } from './useGetFormattedTokensPerChain';
import {
  selectConversionRateForAllChains,
  selectCurrentCurrency,
} from '../../selectors/currencyRateController';
import { InternalAccount } from '@metamask/keyring-api';
import { selectShowFiatInTestnets } from '../../selectors/settings';
import { isTestNet } from '../../util/networks';

export interface TotalFiatBalancesCrossChains {
  [address: string]: {
    tokenFiatBalancesCrossChains: {
      chainId: string;
      nativeFiatValue: number;
      tokenFiatBalances: number[];
      tokensWithBalances: TokensWithBalances[];
    }[];
    totalFiatBalance: number;
    totalTokenFiat: number;
  };
}

export const useGetTotalFiatBalanceCrossChains = (
  accounts: InternalAccount[],
  formattedTokensWithBalancesPerChain: {
    [address: string]: {
      chainId: string;
      tokensWithBalances: TokensWithBalances[];
    }[];
  },
) => {
  const allNetworks = useSelector(selectNetworkConfigurations);
  const currencyRates = useSelector(selectConversionRateForAllChains);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const currentChainId = useSelector(selectChainId);

  const validAccounts =
    accounts.length > 0 && accounts.every((item) => item !== undefined);
  if (!validAccounts || (isTestNet(currentChainId) && !showFiatOnTestnets)) {
    return {};
  }

  const tokenFiatBalancesCrossChains = accounts.map((account) => {
    const formattedPerNetwork = formattedTokensWithBalancesPerChain[
      account.address
    ].map((singleChainTokenBalances) => {
      const { tokensWithBalances } = singleChainTokenBalances;
      const matchedChainSymbol =
        allNetworks[singleChainTokenBalances.chainId as `0x${string}`]
          .nativeCurrency;

      const tokenFiatBalances = tokensWithBalances.map(
        (token) => token.tokenBalanceFiat,
      );

      const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
      const conversionRate =
        currencyRates?.[matchedChainSymbol]?.conversionRate ?? 0;
      let ethFiat = 0;
      if (
        account &&
        accountsByChainId?.[toHexadecimal(singleChainTokenBalances.chainId)]?.[
          toChecksumHexAddress(account.address)
        ]
      ) {
        const balanceBN = hexToBN(
          accountsByChainId[toHexadecimal(singleChainTokenBalances.chainId)][
            toChecksumHexAddress(account.address)
          ].balance,
        );
        const stakedBalanceBN = hexToBN(
          accountsByChainId[toHexadecimal(singleChainTokenBalances.chainId)][
            toChecksumHexAddress(account.address)
          ].stakedBalance || '0x00',
        );
        const totalAccountBalance = balanceBN
          .add(stakedBalanceBN)
          .toString('hex');
        ethFiat = weiToFiatNumber(
          totalAccountBalance,
          conversionRate,
          decimalsToShow,
        );
      }

      return {
        ...singleChainTokenBalances,
        tokenFiatBalances,
        nativeFiatValue: ethFiat,
      };
    });

    return {
      [account.address]: formattedPerNetwork,
    };
  });

  const aggregatedBalPerAccount: TotalFiatBalancesCrossChains = {};

  tokenFiatBalancesCrossChains.forEach((accountElement) => {
    for (const [key, value] of Object.entries(accountElement)) {
      let totalTokenFiat = 0;
      const totalFiatBalance = value.reduce((accumulator, currentValue) => {
        const tokenTmpTotal = currentValue.tokenFiatBalances.reduce(
          (acc, currValue) => acc + currValue,
          0,
        );
        totalTokenFiat += tokenTmpTotal;
        return accumulator + tokenTmpTotal + currentValue.nativeFiatValue;
      }, 0);

      aggregatedBalPerAccount[key] = {
        totalFiatBalance,
        totalTokenFiat,
        tokenFiatBalancesCrossChains: value,
      };
    }
  });

  return aggregatedBalPerAccount;
};

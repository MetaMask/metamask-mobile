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
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../selectors/currencyRateController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectShowFiatInTestnets } from '../../selectors/settings';
import { isTestNet } from '../../util/networks';

interface TokenFiatBalancesCrossChains {
  chainId: string;
  nativeFiatValue: number;
  tokenFiatBalances: number[];
  tokensWithBalances: TokensWithBalances[];
}
export interface TotalFiatBalancesCrossChains {
  [address: string]: {
    tokenFiatBalancesCrossChains: TokenFiatBalancesCrossChains[];
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
  // TODO: [SOLANA] Revisit this before shipping, `selectNetworkConfigurations` selector needs to most likely be replaced by a non evm supported version
  const allNetworks = useSelector(selectNetworkConfigurations);
  const currencyRates = useSelector(selectCurrencyRates);
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
        allNetworks[singleChainTokenBalances.chainId].nativeCurrency;

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

  function getERC20TotalBalance(arr: number[]) {
    let sum = 0;
    for (const num of arr) {
      sum += num;
    }
    return sum;
  }

  function getTotalTokenFiat(array: TokenFiatBalancesCrossChains[]) {
    let totalTokenFiat = 0;
    let totalFiatBalance = 0;

    for (const tokenFiatBalances of array) {
      const tokenTmpTotal = getERC20TotalBalance(
        tokenFiatBalances.tokenFiatBalances,
      );
      totalTokenFiat += tokenTmpTotal;
      totalFiatBalance += tokenTmpTotal + tokenFiatBalances.nativeFiatValue;
    }

    return { totalTokenFiat, totalFiatBalance };
  }

  const aggregatedBalPerAccount: TotalFiatBalancesCrossChains = {};
  for (const accountElement of tokenFiatBalancesCrossChains) {
    for (const [key, value] of Object.entries(accountElement)) {
      const { totalFiatBalance, totalTokenFiat } = getTotalTokenFiat(value);
      aggregatedBalPerAccount[key] = {
        totalFiatBalance,
        totalTokenFiat,
        tokenFiatBalancesCrossChains: value,
      };
    }
  }

  return aggregatedBalPerAccount;
};

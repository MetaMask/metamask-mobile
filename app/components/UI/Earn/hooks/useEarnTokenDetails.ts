import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { TokenI } from '../../Tokens/types';
import { Hex } from '@metamask/utils';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { hexToBN } from '@metamask/controller-utils';
import useBalance from './useBalance';

// Mock APR values - will be replaced with real API data later
const MOCK_APR_VALUES: { [symbol: string]: string } = {
  Ethereum: '2.3',
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
};

export interface EarnTokenDetails extends TokenI {
  apr: string;
  balanceFormatted: string;
  balanceMinimalUnit: string;
  balanceFiat: string;
}

export const useEarnTokenDetails = () => {
  const multiChainTokenBalance = useSelector(selectTokensBalances);
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { balanceWei } = useBalance();

  const getTokenWithBalanceAndApr = useCallback(
    (token: TokenI): EarnTokenDetails => {
      const tokenChainId = token.chainId as Hex;
      const nativeCurrency =
        networkConfigurations?.[tokenChainId]?.nativeCurrency;
      const tokenBalanceMinimalUnit = token.isETH
        ? balanceWei
        : hexToBN(
            multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
              tokenChainId
            ]?.[token.address as Hex],
          ).toString();
      const { balanceValueFormatted, balanceFiat } =
        deriveBalanceFromAssetMarketDetails(
          token,
          multiChainMarketData?.[tokenChainId] || {},
          multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
            tokenChainId
          ] || {},
          multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0,
          currentCurrency || '',
        );

      return {
        ...token,
        balanceMinimalUnit: tokenBalanceMinimalUnit.toString(),
        balanceFormatted: balanceValueFormatted,
        balanceFiat,
        apr: MOCK_APR_VALUES[token.symbol] || '0.0',
      };
    },
    [
      currentCurrency,
      multiChainCurrencyRates,
      multiChainMarketData,
      multiChainTokenBalance,
      networkConfigurations,
      selectedInternalAccountAddress,
    ],
  );

  return {
    getTokenWithBalanceAndApr,
  };
};

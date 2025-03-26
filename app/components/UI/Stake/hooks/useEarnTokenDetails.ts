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
import BigNumber from 'bignumber.js';
import { parseFloatSafe } from '../../Earn/utils';

// Mock APR values - will be replaced with real API data later
const MOCK_APR_VALUES: { [symbol: string]: string } = {
  Ethereum: '2.3',
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
};

interface EarnTokenDetails extends TokenI {
  apr: string;
  estimatedAnnualRewardsFormatted: string;
  tokenBalanceFormatted: string;
  balanceFiat: string | undefined;
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

  const getTokenWithBalanceAndApr = useCallback(
    (token: TokenI): EarnTokenDetails => {
      const tokenChainId = token.chainId as Hex;
      const nativeCurrency =
        networkConfigurations?.[tokenChainId]?.nativeCurrency;

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

      const apr = MOCK_APR_VALUES[token.symbol] || '0.0';

      const rewardRateDecimal = new BigNumber(apr).dividedBy(100).toNumber();

      const tokenFiatBalanceFloat =
        token.balanceFiat && parseFloatSafe(token.balanceFiat).toString();

      const estimatedAnnualRewardsDecimal =
        tokenFiatBalanceFloat &&
        new BigNumber(parseFloat(tokenFiatBalanceFloat))
          .multipliedBy(rewardRateDecimal)
          .toNumber();

      let estimatedAnnualRewardsFormatted = '';

      if (!Number.isNaN(estimatedAnnualRewardsDecimal)) {
        // Show cents ($0.50) for small amounts. Otherwise round up to nearest dollar ($2).
        const numDecimalPlacesToShow =
          estimatedAnnualRewardsDecimal && estimatedAnnualRewardsDecimal > 1
            ? 0
            : 2;

        if (estimatedAnnualRewardsDecimal) {
          estimatedAnnualRewardsFormatted = `$${new BigNumber(
            estimatedAnnualRewardsDecimal,
          ).toFixed(numDecimalPlacesToShow, BigNumber.ROUND_UP)}`;
        }
      }

      return {
        ...token,
        tokenBalanceFormatted: balanceValueFormatted,
        balanceFiat,
        apr,
        estimatedAnnualRewardsFormatted,
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

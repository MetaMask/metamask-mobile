import BN4 from 'bnjs4';
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
import useBalance from '../../Stake/hooks/useBalance';
import BigNumber from 'bignumber.js';
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';

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
  balanceFiat?: string;
  balanceFiatNumber: number;
  estimatedAnnualRewardsFormatted: string;
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

  const { balanceWei, balanceFiatNumber } = useBalance();

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
          );

      const { balanceValueFormatted, balanceFiat, balanceFiatCalculation } =
        deriveBalanceFromAssetMarketDetails(
          token,
          multiChainMarketData?.[tokenChainId] || {},
          multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
            tokenChainId
          ] || {},
          multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0,
          currentCurrency || '',
        );

      let assetBalanceFiatNumber = balanceFiatNumber;
      if (!token.isETH) {
        assetBalanceFiatNumber =
          !balanceFiatCalculation || isNaN(balanceFiatCalculation)
            ? 0
            : balanceFiatCalculation;
      }

      let estimatedAnnualRewardsFormatted = '';
      let apr = '0.0';
      if (isStablecoinLendingFeatureEnabled()) {
        apr = MOCK_APR_VALUES[token.symbol] || apr;
        const rewardRateDecimal = new BigNumber(apr).dividedBy(100).toNumber();
        const estimatedAnnualRewardsDecimal = new BigNumber(
          assetBalanceFiatNumber,
        )
          .multipliedBy(rewardRateDecimal)
          .toNumber();
        if (
          !Number.isNaN(estimatedAnnualRewardsDecimal) &&
          assetBalanceFiatNumber > 0
        ) {
          // Show cents ($0.50) for small amounts. Otherwise round up to nearest dollar ($2).
          const numDecimalPlacesToShow =
            estimatedAnnualRewardsDecimal > 1 ? 0 : 2;

          estimatedAnnualRewardsFormatted = `$${new BigNumber(
            estimatedAnnualRewardsDecimal,
          ).toFixed(numDecimalPlacesToShow, BigNumber.ROUND_UP)}`;
        }
      }

      return {
        ...token,
        // minimal unit balance of the asset
        balanceMinimalUnit: new BN4(
          tokenBalanceMinimalUnit.toString(),
        ).toString(),
        // formatted balance of the asset
        balanceFormatted: balanceValueFormatted,
        // fiat balance of the asset
        balanceFiat,
        // fiat balance of the asset in number format
        balanceFiatNumber: assetBalanceFiatNumber,
        // asset apr info
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
      balanceWei,
      balanceFiatNumber,
    ],
  );

  return {
    getTokenWithBalanceAndApr,
  };
};

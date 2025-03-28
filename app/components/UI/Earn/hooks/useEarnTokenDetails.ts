import { hexToBN } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import BN4 from 'bnjs4';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { addCurrencySymbol } from '../../../../util/number';
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';
import useBalance from '../../Stake/hooks/useBalance';
import { TokenI } from '../../Tokens/types';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';

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
          estimatedAnnualRewardsDecimal > 0
        ) {
          // Show cents ($0.50) for small amounts. Otherwise round up to nearest dollar ($2).
          const numDecimalPlacesToShow =
            estimatedAnnualRewardsDecimal > 1 ? 0 : 2;

          estimatedAnnualRewardsFormatted = `${addCurrencySymbol(
            new BigNumber(estimatedAnnualRewardsDecimal).toFixed(
              numDecimalPlacesToShow,
              BigNumber.ROUND_UP,
            ),
            currentCurrency,
          )}`;
        }
      }

      return {
        ...token,
        // minimal unit balance of the asset, the most accurate
        // i.e. 1000000 would = 1 USDC with 6 decimals
        balanceMinimalUnit: new BN4(
          tokenBalanceMinimalUnit.toString(),
        ).toString(),
        // formatted ui balance of the asset with ticker
        // i.e. 1 ETH or 100.12345 USDC or < 0.00001 ETH
        balanceFormatted: balanceValueFormatted,
        // formatted ui fiat balance of the asset
        // i.e. $100.12 USD or < $0.01 USD
        balanceFiat,
        // fiat balance of the asset in number format, the most accurate
        // i.e. 100.12345
        balanceFiatNumber: assetBalanceFiatNumber,
        // asset apr info
        // i.e. 4.5%
        apr,
        // estimated annual rewards
        // formatted with currency symbol for current currency
        // i.e. $2.12 or £0.00
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

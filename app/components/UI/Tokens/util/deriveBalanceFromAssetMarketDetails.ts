import { MarketDataDetails } from '@metamask/assets-controllers';
import {
  renderFromTokenMinimalUnit,
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../util/number';
import { safeToChecksumAddress } from '../../../../util/address';
import { TOKEN_BALANCE_LOADING, TOKEN_RATE_UNDEFINED } from '../constants';
import { TokenI } from '../types';
import { Hex } from '@metamask/utils';

export const deriveBalanceFromAssetMarketDetails = (
  asset: TokenI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenExchangeRates: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenBalances: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversionRate: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentCurrency: any,
) => {
  const itemAddress: string = safeToChecksumAddress(asset.address) || '';

  let tokenMarketData: MarketDataDetails | 'tokenRateUndefined' | undefined;
  if (tokenExchangeRates) {
    if (tokenExchangeRates[itemAddress as Hex]) {
      tokenMarketData =
        tokenExchangeRates[itemAddress as Hex] || TOKEN_RATE_UNDEFINED;
    }
  }

  const balance =
    asset.balance ||
    (itemAddress in tokenBalances
      ? renderFromTokenMinimalUnit(tokenBalances[itemAddress], asset.decimals)
      : '');

  if (!balance && !asset.isETH) {
    return {
      balanceFiat: TOKEN_BALANCE_LOADING,
      balanceValueFormatted: TOKEN_BALANCE_LOADING,
    };
  }
  let balanceValueFormatted = `${balance} ${asset.symbol}`;
  if (asset.isNative) {
    balanceValueFormatted = `${balance} ${asset.ticker}`;
  }

  if (!conversionRate)
    return {
      balanceFiat: asset.isETH ? asset.balanceFiat : TOKEN_BALANCE_LOADING,
      balanceValueFormatted,
    };

  if (!tokenMarketData || tokenMarketData === TOKEN_RATE_UNDEFINED)
    return {
      balanceFiat:
        asset.isETH || asset.isNative
          ? asset.balanceFiat
          : TOKEN_RATE_UNDEFINED,
      balanceValueFormatted,
    };
  const balanceFiatCalculation = Number(
    asset.balanceFiat ||
      balanceToFiatNumber(balance, conversionRate, tokenMarketData.price),
  );

  const balanceFiat =
    balanceFiatCalculation >= 0.01 || balanceFiatCalculation === 0
      ? addCurrencySymbol(balanceFiatCalculation, currentCurrency)
      : `< ${addCurrencySymbol('0.01', currentCurrency)}`;

  return { balanceFiat, balanceValueFormatted, balanceFiatCalculation };
};

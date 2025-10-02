import { useMemo } from 'react';
import { swapsUtils } from '@metamask/swaps-controller';
import { ContractExchangeRates } from '@metamask/assets-controllers';
import { toWei, weiToFiat } from '../../../../util/number/legacy';
import { hexToDecimal } from '../../../../util/conversions';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { Quote } from '@metamask/swaps-controller/dist/types';
import BigNumber from 'bignumber.js';

interface TokenFee {
  token?: {
    address: string;
    decimals: number;
    symbol: string;
  };
  balanceNeededToken?: string;
}

interface GasTokenFiatAmountParams {
  canUseGasIncludedSwap: boolean;
  selectedQuote: Quote | null;
  tradeTxTokenFee: TokenFee;
  currentCurrency: string;
  fiatConversionRates?: ContractExchangeRates;
}

/**
 * Custom hook to calculate the gas token amount in fiat currency for gas-included swaps
 * @param {Object} options - The options for calculating the gas token fiat amount
 * @param {boolean} options.canUseGasIncludedSwap - Whether gas-included swap feature is available
 * @param {Object} options.selectedQuote - The currently selected quote
 * @param {Object} options.tradeTxTokenFee - The token fee information for the trade
 * @param {string} options.currentCurrency - The current currency
 * @param {Object} options.fiatConversionRates - The fiat conversion rates for tokens
 * @returns {string|undefined} The calculated fiat amount or empty string if not applicable
 */
export function useGasTokenFiatAmount({
  canUseGasIncludedSwap,
  selectedQuote,
  tradeTxTokenFee,
  currentCurrency,
  fiatConversionRates,
}: GasTokenFiatAmountParams): string | undefined {
  return useMemo(() => {
    if (!canUseGasIncludedSwap || !selectedQuote?.trade) {
      return undefined;
    }
    const { token, balanceNeededToken } = tradeTxTokenFee;
    if (!token?.decimals || !token?.address || !balanceNeededToken) {
      return undefined;
    }
    const hexDecimalValue = hexToDecimal(balanceNeededToken);
    const decimalValue = new BigNumber(hexDecimalValue);
    const tokenAmountBN = swapsUtils.calcTokenAmount(
      decimalValue,
      token.decimals,
    );
    const tokenAmount = tokenAmountBN.toString(10);
    const checksumAddress = toChecksumHexAddress(token.address);
    if (!checksumAddress) return undefined;
    const fiatConversionRate = fiatConversionRates?.[checksumAddress];
    return (
      weiToFiat(toWei(tokenAmount), fiatConversionRate, currentCurrency) || ''
    );
  }, [
    canUseGasIncludedSwap,
    selectedQuote?.trade,
    tradeTxTokenFee,
    currentCurrency,
    fiatConversionRates,
  ]);
}

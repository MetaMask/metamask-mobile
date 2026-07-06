import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../../reducers';
import {
  selectCurrencyRateForChainId,
  selectUSDConversionRateByChainId,
} from '../../../../../selectors/currencyRateController';
import { convertFiatToUsd } from '../../../Bridge/utils/exchange-rates';

/**
 * Returns the token's current price in USD for a given EVM chain.
 *
 * Derives it from the already-computed fiat price by applying the
 * native-token USD/fiat ratio — no extra network calls needed.
 * Returns null when rate data is unavailable (e.g. testnet with fiat
 * display disabled, or rates still loading).
 */
export function usePriceInUsd(
  chainId: Hex | null | undefined,
  priceInCurrentCurrency: number,
): number | null {
  const fiatRate = useSelector((state: RootState) =>
    chainId ? selectCurrencyRateForChainId(state, chainId) : undefined,
  );
  const usdRate = useSelector((state: RootState) =>
    chainId ? selectUSDConversionRateByChainId(state, chainId) : undefined,
  );

  if (!Number.isFinite(priceInCurrentCurrency)) {
    return null;
  }

  return convertFiatToUsd(priceInCurrentCurrency, fiatRate, usdRate) ?? null;
}

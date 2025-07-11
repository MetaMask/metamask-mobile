import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { BridgeToken } from '../../types';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { exchangeRateFromMarketData } from '../../utils/exchange-rates';
import {
  setSourceTokenExchangeRate,
  setDestTokenExchangeRate,
} from '../../../../../core/redux/slices/bridge';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';

/**
 * Fetches the exchange rate for a token and stores it in the Redux store
 * @param token - The token to fetch the exchange rate for
 * @param currencyOverride - The currency to use for the exchange rate if you want to override the current currency
 * @param action - The action to dispatch to set the exchange rate
 */
export const useBridgeExchangeRates = ({
  token,
  currencyOverride,
  action,
}: {
  token?: BridgeToken;
  currencyOverride?: string;
  action: typeof setSourceTokenExchangeRate | typeof setDestTokenExchangeRate;
}) => {
  const dispatch = useThunkDispatch();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const evmMarketData = useSelector(selectTokenMarketData);

  // If a currency override is provided, use it, otherwise use the current currency
  // Used in places like metrics, when we want to get a rate specifically in USD
  const currency = currencyOverride ?? currentCurrency;

  // Fetch exchange rates for selected token if not found in marketData
  useEffect(() => {
    if (token?.chainId && token?.address) {
      const exchangeRateInNativeAsset = exchangeRateFromMarketData(
        token.chainId,
        token.address,
        evmMarketData,
      );

      if (!exchangeRateInNativeAsset && !token.currencyExchangeRate) {
        dispatch(
          action({
            chainId: token.chainId,
            tokenAddress: token.address,
            currency,
          }),
        );
      }
    }
  }, [
    currency,
    dispatch,
    token?.chainId,
    token?.address,
    evmMarketData,
    action,
    token?.currencyExchangeRate,
  ]);
};

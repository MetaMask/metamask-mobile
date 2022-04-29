import { useMemo } from 'react';
import { CURRENCIES } from './constants';
import createKeypadRule from './createKeypadRule';

function useCurrency(currency) {
  const currencyData = useMemo(() => {
    if (typeof currency === 'object') {
      return {
        handler: createKeypadRule({
          decimalSeparator: currency?.decimalSeparator,
          decimals: currency?.decimals,
        }),
        symbol: currency?.symbol,
        decimalSeparator: currency?.decimalSeparator,
      };
    }

    if (!currency || !CURRENCIES[currency?.toUpperCase()]) {
      return CURRENCIES.default;
    }

    return CURRENCIES[currency.toUpperCase()];
  }, [currency]);

  const handler = currencyData.handler;
  const symbol = currencyData.symbol;
  const decimalSeparator = currencyData.decimalSeparator;

  return { handler, symbol, decimalSeparator };
}

export default useCurrency;

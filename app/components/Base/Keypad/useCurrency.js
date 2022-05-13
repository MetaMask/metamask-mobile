import { useMemo } from 'react';
import { CURRENCIES } from './constants';

function useCurrency(currency) {
  const currencyData = useMemo(() => {
    if (!currency) {
      return CURRENCIES.default;
    }

    return (
      CURRENCIES[currency] ||
      CURRENCIES[currency.toUpperCase()] ||
      CURRENCIES.default
    );
  }, [currency]);

  const handler = currencyData.handler;
  const symbol = currencyData.symbol;
  const decimalSeparator = currencyData.decimalSeparator;

  return { handler, symbol, decimalSeparator };
}

export default useCurrency;

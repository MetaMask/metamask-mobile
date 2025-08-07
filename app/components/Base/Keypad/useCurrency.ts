import { useMemo } from 'react';
import { CURRENCIES, CurrencyCode, Keys } from './constants';
import createKeypadRule from './createKeypadRule';

interface CurrencyData {
  handler: (currentAmount: string, inputKey: Keys) => string;
  symbol: string | null;
  decimalSeparator: string | null;
}

function useCurrency(currency?: string, decimals?: number): CurrencyData {
  const currencyData = useMemo(() => {
    if (!currency) {
      return CURRENCIES.default;
    }

    const existingCurrency =
      CURRENCIES[currency] ||
      CURRENCIES[currency.toUpperCase() as CurrencyCode];

    if (existingCurrency) {
      return existingCurrency;
    }

    if (decimals && decimals > 0) {
      return {
        decimalSeparator: '.',
        handler: createKeypadRule({ decimalSeparator: '.', decimals }),
        symbol: null,
      };
    }

    return CURRENCIES.default;
  }, [currency, decimals]);

  const handler = currencyData.handler;
  const symbol = currencyData.symbol;
  const decimalSeparator = currencyData.decimalSeparator;

  return { handler, symbol, decimalSeparator };
}

export default useCurrency;

import { CurrencyRateState } from '@metamask/assets-controllers';

export const defaultCurrencyRateState: CurrencyRateState = {
  currentCurrency: 'usd',
  currencyRates: {
    ETH: {
      conversionDate: 0,
      conversionRate: 0,
      usdConversionRate: null,
    },
  },
};

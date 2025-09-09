import { CryptoCurrency, FiatCurrency } from '@consensys/on-ramp-sdk';

export type QuotesParams = {
  amount: number | string;
  asset: CryptoCurrency;
  fiatCurrency: FiatCurrency;
};

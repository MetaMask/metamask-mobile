import { CryptoCurrency, FiatCurrency } from '@consensys/on-ramp-sdk';

export interface QuotesParams {
  amount: number | string;
  asset: CryptoCurrency;
  fiatCurrency: FiatCurrency;
}

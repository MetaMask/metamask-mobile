import {
  rampsPaymentMethodsKeys,
  rampsPaymentMethodsOptions,
} from './paymentMethods';
import { rampsQuotesKeys, rampsQuotesOptions } from './quotes';

export const rampsQueries = {
  paymentMethods: {
    keys: rampsPaymentMethodsKeys,
    options: rampsPaymentMethodsOptions,
  },
  quotes: {
    keys: rampsQuotesKeys,
    options: rampsQuotesOptions,
  },
};

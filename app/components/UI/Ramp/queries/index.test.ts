import { rampsQueries } from './index';
import { rampsPaymentMethodsKeys } from './paymentMethods';
import { rampsProvidersKeys } from './providers';
import { rampsQuotesKeys } from './quotes';

describe('rampsQueries', () => {
  it('exposes all query groups including providers', () => {
    expect(rampsQueries.paymentMethods.keys).toBe(rampsPaymentMethodsKeys);
    expect(rampsQueries.providers.keys).toBe(rampsProvidersKeys);
    expect(rampsQueries.quotes.keys).toBe(rampsQuotesKeys);
    expect(typeof rampsQueries.providers.options).toBe('function');
  });
});

import {
  rampsPaymentMethodsKeys,
  rampsPaymentMethodsOptions,
} from './paymentMethods';

describe('rampsPaymentMethodsOptions', () => {
  it('creates a stable normalized query key from regionCode and providerId only', () => {
    expect(
      rampsPaymentMethodsKeys.detail({
        regionCode: 'US ',
        providerId: '/providers/transak',
      }),
    ).toEqual(['ramps', 'paymentMethods', 'us', '/providers/transak']);
  });

  it('builds query options with provider-scoped key and 5min staleTime', () => {
    const opts = rampsPaymentMethodsOptions({
      regionCode: 'us',
      fiat: 'usd',
      assetId: 'eip155:1/slip44:60',
      providerId: '/providers/transak',
    });

    expect(opts.queryKey).toEqual([
      'ramps',
      'paymentMethods',
      'us',
      '/providers/transak',
    ]);
    expect(typeof opts.queryFn).toBe('function');
    expect(opts.staleTime).toBe(0);
  });
});

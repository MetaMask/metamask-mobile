import {
  rampsPaymentMethodsKeys,
  rampsPaymentMethodsOptions,
} from './paymentMethods';

describe('rampsPaymentMethodsOptions', () => {
  it('creates a stable normalized query key', () => {
    expect(
      rampsPaymentMethodsKeys.detail({
        regionCode: 'US ',
        fiat: ' USD',
        assetId: 'eip155:1/slip44:60',
        providerId: '/providers/transak',
      }),
    ).toEqual([
      'ramps',
      'paymentMethods',
      'us',
      'usd',
      'eip155:1/slip44:60',
      '/providers/transak',
    ]);
  });

  it('builds query options for payment methods', () => {
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
      'usd',
      'eip155:1/slip44:60',
      '/providers/transak',
    ]);
    expect(typeof opts.queryFn).toBe('function');
    expect(opts.staleTime).toBe(0);
  });
});

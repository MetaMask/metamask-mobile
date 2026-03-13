import { rampsQuotesKeys, rampsQuotesOptions } from './quotes';

describe('rampsQuotesOptions', () => {
  it('creates a stable query key for quotes', () => {
    expect(
      rampsQuotesKeys.detail({
        assetId: 'eip155:1/slip44:60',
        amount: 100,
        walletAddress: '0x123',
        paymentMethodId: '/payments/card',
        providerId: '/providers/transak',
      }),
    ).toEqual([
      'ramps',
      'quotes',
      'eip155:1/slip44:60',
      100,
      '0x123',
      '/payments/card',
      '/providers/transak',
    ]);
  });

  it('builds query options for quotes', () => {
    const opts = rampsQuotesOptions({
      assetId: 'eip155:1/slip44:60',
      amount: 100,
      walletAddress: '0x123',
      paymentMethodId: '/payments/card',
      providerId: '/providers/transak',
      forceRefresh: true,
    });

    expect(opts.queryKey).toEqual([
      'ramps',
      'quotes',
      'eip155:1/slip44:60',
      100,
      '0x123',
      '/payments/card',
      '/providers/transak',
    ]);
    expect(typeof opts.queryFn).toBe('function');
    expect(opts.staleTime).toBe(0);
  });
});

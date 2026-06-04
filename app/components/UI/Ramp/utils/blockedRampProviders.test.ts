import {
  filterBlockedRampProviderCustomActions,
  filterBlockedRampProviderIds,
  filterBlockedRampProviderItems,
  filterBlockedRampProviders,
  filterBlockedRampProvidersFromQuotesResponse,
  filterBlockedRampProviderSortedMetadata,
  isBlockedRampProvider,
} from './blockedRampProviders';

describe('blockedRampProviders', () => {
  it.each([
    ['/providers/blockchain'],
    ['/providers/blockchain-com'],
    ['Blockchain.com'],
    [{ id: '/providers/blockchain-com', name: 'Blockchain.com' }],
  ])('identifies blocked provider %p', (provider) => {
    expect(isBlockedRampProvider(provider)).toBe(true);
  });

  it.each([
    ['/providers/transak'],
    ['Transak'],
    [{ id: '/providers/moonpay', name: 'MoonPay' }],
  ])('allows provider %p', (provider) => {
    expect(isBlockedRampProvider(provider)).toBe(false);
  });

  it('filters blocked providers from provider catalogs', () => {
    expect(
      filterBlockedRampProviders([
        { id: '/providers/transak', name: 'Transak' },
        { id: '/providers/blockchain-com', name: 'Blockchain.com' },
      ]),
    ).toEqual([{ id: '/providers/transak', name: 'Transak' }]);
  });

  it('filters blocked provider ids from request params', () => {
    expect(
      filterBlockedRampProviderIds([
        '/providers/transak',
        '/providers/blockchain-com',
      ]),
    ).toEqual(['/providers/transak']);
  });

  it('filters blocked quote-like items', () => {
    expect(
      filterBlockedRampProviderItems([
        { provider: '/providers/transak' },
        {
          provider: '/providers/blockchain-com',
          providerInfo: { name: 'Blockchain.com' },
        },
        { providerInfo: { id: '/providers/blockchain' } },
      ]),
    ).toEqual([{ provider: '/providers/transak' }]);
  });

  it('filters blocked custom actions', () => {
    expect(
      filterBlockedRampProviderCustomActions([
        { buy: { providerId: '/providers/paypal' } },
        { buy: { provider: { id: '/providers/blockchain-com' } } },
      ]),
    ).toEqual([{ buy: { providerId: '/providers/paypal' } }]);
  });

  it('removes blocked provider ids from sorted metadata', () => {
    expect(
      filterBlockedRampProviderSortedMetadata([
        {
          sortBy: 'price',
          ids: ['/providers/blockchain-com', '/providers/transak'],
        },
      ]),
    ).toEqual([{ sortBy: 'price', ids: ['/providers/transak'] }]);
  });

  it('filters all provider-bearing fields in a quotes response', () => {
    const response = {
      success: [
        { provider: '/providers/transak' },
        { providerInfo: { name: 'Blockchain.com' } },
      ],
      error: [
        { provider: '/providers/blockchain-com', error: 'unavailable' },
        { provider: '/providers/moonpay', error: 'unavailable' },
      ],
      customActions: [
        { buy: { providerId: '/providers/blockchain' } },
        { buy: { providerId: '/providers/paypal' } },
      ],
      sorted: [
        {
          sortBy: 'reliability',
          ids: ['/providers/blockchain-com', '/providers/transak'],
        },
      ],
    };

    expect(filterBlockedRampProvidersFromQuotesResponse(response)).toEqual({
      success: [{ provider: '/providers/transak' }],
      error: [{ provider: '/providers/moonpay', error: 'unavailable' }],
      customActions: [{ buy: { providerId: '/providers/paypal' } }],
      sorted: [{ sortBy: 'reliability', ids: ['/providers/transak'] }],
    });
  });
});

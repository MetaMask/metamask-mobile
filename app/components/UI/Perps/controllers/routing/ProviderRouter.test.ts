import { ProviderRouter } from './ProviderRouter';

describe('ProviderRouter', () => {
  let router: ProviderRouter;

  beforeEach(() => {
    router = new ProviderRouter({ defaultProvider: 'hyperliquid' });
  });

  describe('constructor', () => {
    it('should set default provider from options', () => {
      const customRouter = new ProviderRouter({ defaultProvider: 'myx' });
      expect(customRouter.getDefaultProvider()).toBe('myx');
    });

    it('should set default strategy to default_provider', () => {
      expect(router.getStrategy()).toBe('default_provider');
    });

    it('should accept custom strategy', () => {
      const customRouter = new ProviderRouter({
        defaultProvider: 'hyperliquid',
        strategy: 'default_provider',
      });
      expect(customRouter.getStrategy()).toBe('default_provider');
    });
  });

  describe('selectProvider', () => {
    it('should return explicit providerId when provided', () => {
      const result = router.selectProvider({ providerId: 'myx' });
      expect(result).toBe('myx');
    });

    it('should return explicit providerId even when symbol is provided', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC', 'ETH']);
      const result = router.selectProvider({
        symbol: 'BTC',
        providerId: 'myx',
      });
      expect(result).toBe('myx');
    });

    it('should return default provider when no providerId is specified', () => {
      const result = router.selectProvider({ symbol: 'BTC' });
      expect(result).toBe('hyperliquid');
    });

    it('should return default provider when params are empty', () => {
      const result = router.selectProvider({});
      expect(result).toBe('hyperliquid');
    });

    it('should support custom provider types', () => {
      const result = router.selectProvider({ providerId: 'custom-provider' });
      expect(result).toBe('custom-provider');
    });
  });

  describe('getProvidersForMarket', () => {
    beforeEach(() => {
      router.updateProviderMarkets('hyperliquid', ['BTC', 'ETH', 'SOL']);
      router.updateProviderMarkets('myx', ['BTC', 'ETH', 'ARB']);
    });

    it('should return all providers that support a market', () => {
      const providers = router.getProvidersForMarket('BTC');
      expect(providers).toContain('hyperliquid');
      expect(providers).toContain('myx');
      expect(providers).toHaveLength(2);
    });

    it('should return single provider for exclusive market', () => {
      const providers = router.getProvidersForMarket('SOL');
      expect(providers).toEqual(['hyperliquid']);
    });

    it('should return empty array for unknown market', () => {
      const providers = router.getProvidersForMarket('UNKNOWN');
      expect(providers).toEqual([]);
    });
  });

  describe('updateProviderMarkets', () => {
    it('should add markets for a provider', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC', 'ETH']);

      expect(router.providerSupportsMarket('hyperliquid', 'BTC')).toBe(true);
      expect(router.providerSupportsMarket('hyperliquid', 'ETH')).toBe(true);
      expect(router.providerSupportsMarket('hyperliquid', 'SOL')).toBe(false);
    });

    it('should replace existing markets when called again', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC', 'ETH']);
      router.updateProviderMarkets('hyperliquid', ['SOL', 'ARB']);

      expect(router.providerSupportsMarket('hyperliquid', 'BTC')).toBe(false);
      expect(router.providerSupportsMarket('hyperliquid', 'SOL')).toBe(true);
    });

    it('should handle empty markets array', () => {
      router.updateProviderMarkets('hyperliquid', []);
      expect(router.providerSupportsMarket('hyperliquid', 'BTC')).toBe(false);
    });
  });

  describe('clearProviderMarkets', () => {
    it('should remove all markets for a provider', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC', 'ETH']);
      router.clearProviderMarkets('hyperliquid');

      expect(router.providerSupportsMarket('hyperliquid', 'BTC')).toBe(false);
      expect(router.getProvidersForMarket('BTC')).toEqual([]);
    });

    it('should not affect other providers', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC']);
      router.updateProviderMarkets('myx', ['BTC']);
      router.clearProviderMarkets('hyperliquid');

      expect(router.getProvidersForMarket('BTC')).toEqual(['myx']);
    });
  });

  describe('setDefaultProvider', () => {
    it('should update the default provider', () => {
      router.setDefaultProvider('myx');
      expect(router.getDefaultProvider()).toBe('myx');
    });

    it('should affect subsequent selectProvider calls', () => {
      router.setDefaultProvider('myx');
      const result = router.selectProvider({ symbol: 'BTC' });
      expect(result).toBe('myx');
    });
  });

  describe('providerSupportsMarket', () => {
    it('should return true when provider supports market', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC', 'ETH']);
      expect(router.providerSupportsMarket('hyperliquid', 'BTC')).toBe(true);
    });

    it('should return false when provider does not support market', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC', 'ETH']);
      expect(router.providerSupportsMarket('hyperliquid', 'SOL')).toBe(false);
    });

    it('should return false for unknown provider', () => {
      expect(router.providerSupportsMarket('unknown', 'BTC')).toBe(false);
    });
  });

  describe('getRegisteredProviders', () => {
    it('should return empty array when no providers registered', () => {
      expect(router.getRegisteredProviders()).toEqual([]);
    });

    it('should return all providers with registered markets', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC']);
      router.updateProviderMarkets('myx', ['ETH']);

      const providers = router.getRegisteredProviders();
      expect(providers).toContain('hyperliquid');
      expect(providers).toContain('myx');
      expect(providers).toHaveLength(2);
    });

    it('should not include cleared providers', () => {
      router.updateProviderMarkets('hyperliquid', ['BTC']);
      router.updateProviderMarkets('myx', ['ETH']);
      router.clearProviderMarkets('hyperliquid');

      const providers = router.getRegisteredProviders();
      expect(providers).toEqual(['myx']);
    });
  });
});

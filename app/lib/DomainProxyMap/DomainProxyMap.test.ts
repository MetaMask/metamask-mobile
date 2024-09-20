import DomainProxyMap from './DomainProxyMap';
import type { NetworkProxy } from '@metamask/selected-network-controller';
import type {
  ProviderProxy,
  BlockTrackerProxy,
} from '@metamask/network-controller';

// Mock the necessary types
jest.mock('@metamask/selected-network-controller');
jest.mock('@metamask/network-controller');
jest.mock('@metamask/base-controller');
jest.mock('@metamask/swappable-obj-proxy');

describe('DomainProxyMap', () => {
  let domainProxyMap: DomainProxyMap;

  // Helper function to create a mock NetworkProxy
  const createMockNetworkProxy = (): NetworkProxy => ({
    provider: {
      sendAsync: jest.fn(),
    } as unknown as ProviderProxy,
    blockTracker: {
      destroy: jest.fn(),
      getLatestBlock: jest.fn(),
    } as unknown as BlockTrackerProxy,
  });

  beforeEach(() => {
    domainProxyMap = new DomainProxyMap();
  });

  test('should set and get a NetworkProxy', () => {
    const domain = 'example.com';
    const proxy = createMockNetworkProxy();

    domainProxyMap.set(domain, proxy);
    const retrievedProxy = domainProxyMap.get(domain);

    expect(retrievedProxy).toBe(proxy);
    expect(retrievedProxy?.provider.sendAsync).toBe(proxy.provider.sendAsync);
    expect(retrievedProxy?.blockTracker.getLatestBlock).toBe(
      proxy.blockTracker.getLatestBlock,
    );
  });

  test('should return undefined for non-existent domain', () => {
    expect(domainProxyMap.get('nonexistent.com')).toBeUndefined();
  });

  test('should delete a NetworkProxy', () => {
    const domain = 'example.com';
    const proxy = createMockNetworkProxy();

    domainProxyMap.set(domain, proxy);
    expect(domainProxyMap.delete(domain)).toBe(true);
    expect(domainProxyMap.get(domain)).toBeUndefined();
  });

  test('should return false when deleting non-existent domain', () => {
    expect(domainProxyMap.delete('nonexistent.com')).toBe(false);
  });

  test('should implement size property', () => {
    expect(domainProxyMap.size).toBe(0);
    domainProxyMap.set('example.com', createMockNetworkProxy());
    expect(domainProxyMap.size).toBe(1);
  });

  test('should implement has method', () => {
    const domain = 'example.com';
    expect(domainProxyMap.has(domain)).toBe(false);
    domainProxyMap.set(domain, createMockNetworkProxy());
    expect(domainProxyMap.has(domain)).toBe(true);
  });

  test('should implement clear method', () => {
    domainProxyMap.set('example1.com', createMockNetworkProxy());
    domainProxyMap.set('example2.com', createMockNetworkProxy());
    domainProxyMap.clear();
    expect(domainProxyMap.size).toBe(0);
  });

  test('should implement forEach method', () => {
    const domains = ['example1.com', 'example2.com', 'example3.com'];
    domains.forEach((domain) =>
      domainProxyMap.set(domain, createMockNetworkProxy()),
    );

    const mockCallback = jest.fn();
    domainProxyMap.forEach(mockCallback);

    expect(mockCallback).toHaveBeenCalledTimes(3);
    domains.forEach((domain) => {
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: expect.any(Object),
          blockTracker: expect.any(Object),
        }),
        domain,
        expect.any(Map),
      );
    });
  });

  test('should implement entries method', () => {
    const domain = 'example.com';
    const proxy = createMockNetworkProxy();
    domainProxyMap.set(domain, proxy);

    const entries = Array.from(domainProxyMap.entries());
    expect(entries).toEqual([[domain, proxy]]);
  });

  test('should implement keys method', () => {
    const domains = ['example1.com', 'example2.com'];
    domains.forEach((domain) =>
      domainProxyMap.set(domain, createMockNetworkProxy()),
    );

    const keys = Array.from(domainProxyMap.keys());
    expect(keys).toEqual(domains);
  });

  test('should implement values method', () => {
    const domains = ['example1.com', 'example2.com'];
    const proxies = domains.map(() => createMockNetworkProxy());
    domains.forEach((domain, index) =>
      domainProxyMap.set(domain, proxies[index]),
    );

    const values = Array.from(domainProxyMap.values());
    expect(values).toEqual(proxies);
  });

  test('should be iterable', () => {
    const domain = 'example.com';
    const proxy = createMockNetworkProxy();
    domainProxyMap.set(domain, proxy);

    for (const [key, value] of domainProxyMap) {
      expect(key).toBe(domain);
      expect(value).toBe(proxy);
    }
  });

  test('should implement cleanInactiveDomains method', () => {
    const domains = ['example1.com', 'example2.com', 'example3.com'];
    domains.forEach((domain) =>
      domainProxyMap.set(domain, createMockNetworkProxy()),
    );

    domainProxyMap.cleanInactiveDomains(['example1.com', 'example2.com']);

    expect(domainProxyMap.has('example1.com')).toBe(true);
    expect(domainProxyMap.has('example2.com')).toBe(true);
    expect(domainProxyMap.has('example3.com')).toBe(false);
  });
});

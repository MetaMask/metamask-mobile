import type { NetworkProxy } from '@metamask/selected-network-controller';

export default class DomainProxyMap implements Map<string, NetworkProxy> {
  private domainProxyMap: Map<string, NetworkProxy>;

  constructor() {
    this.domainProxyMap = new Map<string, NetworkProxy>();
  }

  get(key: string): NetworkProxy | undefined {
    return this.domainProxyMap.get(key);
  }

  set(key: string, value: NetworkProxy): this {
    this.domainProxyMap.set(key, value);
    return this;
  }

  delete(key: string): boolean {
    return this.domainProxyMap.delete(key);
  }

  has(key: string): boolean {
    return this.domainProxyMap.has(key);
  }

  clear(): void {
    this.domainProxyMap.clear();
  }

  get size(): number {
    return this.domainProxyMap.size;
  }

  forEach(
    callbackfn: (
      value: NetworkProxy,
      key: string,
      map: Map<string, NetworkProxy>,
    ) => void,
    // this is an unbound method, so the this value is unknown.
    // Also the Map type this is based on uses any for this parameter as well.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any,
  ): void {
    this.domainProxyMap.forEach(callbackfn, thisArg);
  }

  entries(): IterableIterator<[string, NetworkProxy]> {
    return this.domainProxyMap.entries();
  }

  keys(): IterableIterator<string> {
    return this.domainProxyMap.keys();
  }

  values(): IterableIterator<NetworkProxy> {
    return this.domainProxyMap.values();
  }

  [Symbol.iterator](): IterableIterator<[string, NetworkProxy]> {
    return this.domainProxyMap[Symbol.iterator]();
  }

  [Symbol.toStringTag] = 'DomainProxyMap';

  cleanInactiveDomains(activeDomains: string[]): void {
    for (const domain of this.domainProxyMap.keys()) {
      if (!activeDomains.includes(domain)) {
        this.domainProxyMap.delete(domain);
      }
    }
  }
}

import type { NetworkProxy } from '@metamask/selected-network-controller';

export default class DomainProxyMap extends Map<string, NetworkProxy> {
  set(key: string, value: NetworkProxy): this {
    super.set(key, value);
    return this;
  }

  cleanInactiveDomains(activeDomains: string[]): void {
    for (const domain of this.keys()) {
      if (!activeDomains.includes(domain)) {
        this.delete(domain);
      }
    }
  }

  get [Symbol.toStringTag](): string {
    return 'DomainProxyMap';
  }
}

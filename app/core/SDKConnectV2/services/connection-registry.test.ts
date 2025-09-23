import { ConnectionRegistry } from './connection-registry';
import { HostApplicationAdapter } from '../adapters/host-application-adapter';
import { ConnectionStore } from '../store/connection-store';

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;

  beforeEach(() => {
    const hostapp = new HostApplicationAdapter();
    const store = new ConnectionStore();
    registry = new ConnectionRegistry(hostapp, store);
  });

  it('dummy tests for scaffolding, will be replaced with real tests', () => {
    expect(registry).toBeDefined();
    expect(() => registry.handleConnectDeeplink('test-deeplink')).not.toThrow();
  });
});

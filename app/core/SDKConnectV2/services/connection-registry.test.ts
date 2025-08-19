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

  describe('dummy tests for scaffolding, will be replaced with real tests', () => {
    it('should be defined', () => {
      expect(registry).toBeDefined();
    });

    it('should handle connect deeplink', () => {
      expect(registry.handleConnectDeeplink).toBeDefined();
    });
  });
});

import { ConnectionRegistry } from './connection-registry';
import { HostApplicationAdapter } from '../adapters/host-application-adapter';
import { ConnectionStore } from '../store/connection-store';
import { KeyManager } from './key-manager';

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;
  let hostapp: HostApplicationAdapter;
  let store: ConnectionStore;
  let keymanager: KeyManager;
  const relayURL = 'https://test-relay.example.com';

  beforeEach(() => {
    hostapp = new HostApplicationAdapter();
    store = new ConnectionStore('test-connections');
    keymanager = new KeyManager();
    registry = new ConnectionRegistry(relayURL, keymanager, hostapp, store);
  });

  it('should create an instance', () => {
    expect(registry).toBeDefined();
  });
});

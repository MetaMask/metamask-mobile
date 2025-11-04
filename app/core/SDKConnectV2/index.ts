import { HostApplicationAdapter } from './adapters/host-application-adapter';
import { ConnectionStore } from './store/connection-store';
import { ConnectionRegistry } from './services/connection-registry';
import { KeyManager } from './services/key-manager';

const relayURL = 'wss://mm-sdk-relay.api.cx.metamask.io/connection/websocket';
const keymanager = new KeyManager();
const hostapp = new HostApplicationAdapter();
const store = new ConnectionStore('sdk-connect-v2/connections');
const registry = new ConnectionRegistry(relayURL, keymanager, hostapp, store);

export default registry;

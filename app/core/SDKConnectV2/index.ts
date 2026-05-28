import { HostApplicationAdapter } from './adapters/host-application-adapter';
import { ConnectionStore } from './store/connection-store';
import { ConnectionRegistry } from './services/connection-registry';
import { KeyManager } from './services/key-manager';
import { devApiEnv } from '../devApiEnv';

const RELAY_URLS = {
  DEV: 'wss://mm-sdk-relay.dev-api.cx.metamask.io/connection/websocket',
  PROD: 'wss://mm-sdk-relay.api.cx.metamask.io/connection/websocket',
} as const;

/** Must match `devApiEnv()` used by agentic CLI auth/dashboard URL selection. */
const relayURL = devApiEnv() === 'dev' ? RELAY_URLS.DEV : RELAY_URLS.PROD;
const keymanager = new KeyManager();
const hostapp = new HostApplicationAdapter();
const store = new ConnectionStore('sdk-connect-v2/connections');
const registry = new ConnectionRegistry(relayURL, keymanager, hostapp, store);

export default registry;

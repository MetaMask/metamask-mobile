import { HostApplicationAdapter } from './adapters/host-application-adapter';
import { ConnectionStore } from './store/connection-store';
import { ConnectionRegistry } from './services/connection-registry';

const hostapp = new HostApplicationAdapter();
const store = new ConnectionStore();
const registry = new ConnectionRegistry(hostapp, store);

export default registry;

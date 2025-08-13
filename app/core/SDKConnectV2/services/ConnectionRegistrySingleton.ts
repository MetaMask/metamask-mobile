import { HostApplicationAdapter } from '../adapters/HostApplicationAdapter';
import { ConnectionStore } from '../store/ConnectionStore';
import { ConnectionRegistry } from './ConnectionRegistry';

const hostApplicationAdapter = new HostApplicationAdapter();
const connectionStore = new ConnectionStore();
const connectionRegistry = new ConnectionRegistry(hostApplicationAdapter, connectionStore);

export default connectionRegistry;

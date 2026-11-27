// Side-effect entry, imported from index.js right after the nitro setups so it
// wraps the final `global.fetch` / `global.WebSocket`. No-op outside __DEV__.
import { installNetworkInspector } from './install';

installNetworkInspector();

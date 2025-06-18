// eslint-disable-next-line import/no-namespace
import * as FileSystem from 'expo-file-system';

const EntryScriptWeb3 = {
  entryScriptWeb3: null,
  // Cache InpageBridgeWeb3 so that it is immediately available
  async init() {
    const entryScriptInitStart = Date.now();
    this.entryScriptWeb3 = await FileSystem.readAsStringAsync(
      `${FileSystem.bundleDirectory}InpageBridgeWeb3.js`,
    );
    console.warn(
      `🧩 ASYNC EntryScriptWeb3 initialization time: ${entryScriptInitEnd - entryScriptInitStart}ms`
    );
    return this.entryScriptWeb3;
  },
  async get() {
    // Return from cache
    if (this.entryScriptWeb3) return this.entryScriptWeb3;

    // If for some reason it is not available, get it again
    return await this.init();
  },
};

export default EntryScriptWeb3;

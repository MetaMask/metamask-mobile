// expo-file-system@19 (Expo SDK 54) deprecates `readAsStringAsync` on the main
// entrypoint (it throws at runtime). The new `File`/`Paths` API does not grant
// read permission for bundle assets on iOS (`MissingPermissionException`), so
// the only working option for reading bundled JS at runtime is the legacy
// entrypoint. It's officially supported alongside the new API and will continue
// to work; Expo flagged this exact use case (bundle reads) as a follow-up to
// expose in the new API.
// eslint-disable-next-line import-x/no-namespace
import * as FileSystem from 'expo-file-system/legacy';
import Logger from '../util/Logger';

const EntryScriptWeb3 = {
  entryScriptWeb3: null,
  // Cache InpageBridgeWeb3 so that it is immediately available
  async init() {
    try {
      this.entryScriptWeb3 = await FileSystem.readAsStringAsync(
        `${FileSystem.bundleDirectory}InpageBridgeWeb3.js`,
      );
    } catch (err) {
      Logger.error(err, 'EntryScriptWeb3.init failed to read InpageBridgeWeb3');
      // Fall back to empty string so callers don't gate the WebView off
      // forever. dApp provider features will be unavailable but pages still
      // render in the browser.
      this.entryScriptWeb3 = '';
    }
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

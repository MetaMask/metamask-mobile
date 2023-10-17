import Device from '../util/device';
import RNFS from 'react-native-fs';

const EntryScriptWeb3 = {
  entryScriptWeb3: null,
  // Cache InpageBridgeWeb3 so that it is immediately available
  async init() {
    this.entryScriptWeb3 = Device.isIos()
      ? await RNFS.readFile(
          `${RNFS.MainBundlePath}/InpageBridgeWeb3.js`,
          'utf8',
        )
      : await RNFS.readFileAssets(`InpageBridgeWeb3.js`);

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

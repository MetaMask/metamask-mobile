import Device from '../util/device';
import RNFS from 'react-native-fs';

const InpageProviderWeb3 = {
  inpageProviderWeb3: null,
  // Cache InpageProviderWeb3 so that it is immediately available
  async init() {
    this.inpageProviderWeb3 = Device.isIos()
      ? await RNFS.readFile(
          `${RNFS.MainBundlePath}/InpageContentWeb3.js`,
          'utf8',
        )
      : await RNFS.readFileAssets(`InpageContentWeb3.js`);

    return this.inpageProviderWeb3;
  },
  async get() {
    // Return from cache
    if (this.inpageProviderWeb3) return this.inpageProviderWeb3;

    // If for some reason it is not available, get it again
    return await this.init();
  },
};

export default InpageProviderWeb3;

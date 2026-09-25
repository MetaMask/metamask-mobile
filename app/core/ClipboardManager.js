import Clipboard from '@react-native-clipboard/clipboard';
import Device from '../util/device';
import Logger from '../util/Logger';

const EXPIRE_TIME_MS = 60000;
let clipboardRevision = 0;

const ClipboardManager = {
  async getString() {
    return await Clipboard.getString();
  },
  async hasString() {
    return await Clipboard.hasString();
  },
  getRevision() {
    return clipboardRevision;
  },
  addListener(listener) {
    return Clipboard.addListener(listener);
  },
  async setString(string) {
    await Clipboard.setString(string);
    clipboardRevision += 1;
  },
  expireTime: null,
  async setStringExpire(string) {
    if (Device.isIos()) {
      try {
        await Clipboard.setStringExpire(string);
        clipboardRevision += 1;
      } catch (error) {
        // Fallback to regular setString if setStringExpire fails
        Logger.error(
          error,
          'setStringExpire failed, falling back to setString',
        );
        await this.setString(string);
      }
    } else {
      await this.setString(string);
      if (this.expireTime) {
        clearTimeout(this.expireTime);
      }
      this.expireTime = setTimeout(async () => {
        const string = await this.getString();

        if (!string) return;

        try {
          await Clipboard.clearString();
        } catch (_) {
          //Fail silently
        }
      }, EXPIRE_TIME_MS);
    }
  },
};

export default ClipboardManager;

import Clipboard from '@react-native-clipboard/clipboard';
import Device from '../util/device';

const EXPIRE_TIME_MS = 60000;

interface ClipboardManagerType {
  getString: () => Promise<string>;
  setString: (string: string) => Promise<void>;
  setStringExpire: (string: string) => Promise<void>;
  clearString: () => Promise<void>;
  expireTime: NodeJS.Timeout | null;
}

const ClipboardManager: ClipboardManagerType = {
  async getString(): Promise<string> {
    return await Clipboard.getString();
  },
  async setString(string: string): Promise<void> {
    await Clipboard.setString(string);
  },
  expireTime: null,
  async setStringExpire(string: string): Promise<void> {
    if (Device.isIos()) {
      await Clipboard.setStringExpire(string);
    } else {
      await this.setString(string);
      if (this.expireTime) {
        clearTimeout(this.expireTime);
      }
      this.expireTime = setTimeout(async () => {
        const clipboardString = await this.getString();

        if (!clipboardString) return;

        await Clipboard.clearString();
      }, EXPIRE_TIME_MS);
    }
  },
  async clearString(): Promise<void> {
    const clipboardString = await this.getString();
    if (clipboardString) {
      await Clipboard.clearString();
    }
  },
};

export default ClipboardManager;

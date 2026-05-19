import { ApkManager } from '../apk-manager';
import { existsSync } from 'fs';

jest.mock('child_process', () => ({
  execFile: jest.fn(
    (_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, '', '');
    },
  ),
}));
jest.mock('fs', () => ({ existsSync: jest.fn() }));

const mockExistsSync = existsSync as jest.Mock;

describe('ApkManager', () => {
  let apk: ApkManager;

  beforeEach(() => {
    jest.clearAllMocks();
    apk = new ApkManager();
  });

  describe('installApk', () => {
    it('throws if apk file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(apk.installApk('/bad/path.apk')).rejects.toThrow(
        'APK file not found',
      );
    });
  });

  describe('interface', () => {
    it('exposes expected methods', () => {
      expect(typeof apk.installApk).toBe('function');
      expect(typeof apk.upgradeApk).toBe('function');
      expect(typeof apk.uninstallApp).toBe('function');
      expect(typeof apk.isAppInstalled).toBe('function');
      expect(typeof apk.getInstalledVersion).toBe('function');
    });
  });
});

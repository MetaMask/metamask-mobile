import { AdbBridge } from '../adb-bridge';
import { execFile } from 'child_process';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

const mockExecFile = execFile as unknown as jest.Mock;

function mockExecSuccess(stdout: string) {
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, stdout, '');
    },
  );
}

describe('AdbBridge', () => {
  let adb: AdbBridge;

  beforeEach(() => {
    jest.clearAllMocks();
    adb = new AdbBridge();
  });

  describe('listDevices', () => {
    it('parses adb devices output', async () => {
      mockExecSuccess(
        'List of devices attached\n' +
          '1A2B3C4D\tdevice\n' +
          'emulator-5554\tdevice\n' +
          '\n',
      );
      const devices = await adb.listDevices();
      expect(devices).toEqual(['1A2B3C4D', 'emulator-5554']);
    });

    it('returns empty array when no devices', async () => {
      mockExecSuccess('List of devices attached\n\n');
      const devices = await adb.listDevices();
      expect(devices).toEqual([]);
    });
  });

  describe('getScreenSize', () => {
    it('parses physical size output', async () => {
      mockExecSuccess('Physical size: 1080x2400\n');
      const size = await adb.getScreenSize();
      expect(size).toEqual([1080, 2400]);
    });
  });

  describe('getDeviceModel', () => {
    it('returns trimmed model name', async () => {
      mockExecSuccess('Pixel 7\n');
      const model = await adb.getDeviceModel();
      expect(model).toBe('Pixel 7');
    });
  });

  describe('tap', () => {
    it('calls adb shell input tap with coordinates', async () => {
      mockExecSuccess('');
      await adb.tap(540, 890);
      expect(mockExecFile).toHaveBeenCalledWith(
        'adb',
        ['shell', 'input', 'tap', '540', '890'],
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe('typeText', () => {
    it('escapes spaces in text', async () => {
      mockExecSuccess('');
      await adb.typeText('hello world');
      expect(mockExecFile).toHaveBeenCalledWith(
        'adb',
        ['shell', 'input', 'text', 'hello%sworld'],
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe('pressBack', () => {
    it('sends KEYCODE_BACK', async () => {
      mockExecSuccess('');
      await adb.pressBack();
      expect(mockExecFile).toHaveBeenCalledWith(
        'adb',
        ['shell', 'input', 'keyevent', 'KEYCODE_BACK'],
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe('pressHome', () => {
    it('sends KEYCODE_HOME', async () => {
      mockExecSuccess('');
      await adb.pressHome();
      expect(mockExecFile).toHaveBeenCalledWith(
        'adb',
        ['shell', 'input', 'keyevent', 'KEYCODE_HOME'],
        expect.any(Object),
        expect.any(Function),
      );
    });
  });
});

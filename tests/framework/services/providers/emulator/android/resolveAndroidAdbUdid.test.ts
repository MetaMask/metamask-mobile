jest.mock('child_process', () => {
  const actual =
    jest.requireActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    execFile: jest.fn(),
  };
});

import { execFile } from 'child_process';
import {
  __clearAndroidAdbUdidCacheForTests,
  parseAdbDevicesOutput,
  parseAvdNameFromEmuOutput,
  resolveAndroidAdbUdidForDevice,
} from './resolveAndroidAdbUdid';
import { ProviderName } from '../../../../types';

const execFileMock = execFile as unknown as jest.Mock;

describe('parseAvdNameFromEmuOutput', () => {
  it('returns the first line when output is a single AVD name', () => {
    const out = 'Pixel_5_Pro_API_34\n';

    expect(parseAvdNameFromEmuOutput(out)).toBe('Pixel_5_Pro_API_34');
  });

  it('strips a trailing OK line from emulator console output', () => {
    const out = 'Pixel_5_Pro_API_34\nOK\n';

    expect(parseAvdNameFromEmuOutput(out)).toBe('Pixel_5_Pro_API_34');
  });

  it('strips a trailing ok line case-insensitively', () => {
    const out = 'My_Avd_Name\nok\n';

    expect(parseAvdNameFromEmuOutput(out)).toBe('My_Avd_Name');
  });
});

describe('parseAdbDevicesOutput', () => {
  afterEach(() => {
    __clearAndroidAdbUdidCacheForTests();
  });

  it('returns emulator serials in device state', () => {
    const out = `List of devices attached
emulator-5554\tdevice
emulator-5556\tdevice
`;

    const result = parseAdbDevicesOutput(out);

    expect(result).toEqual(['emulator-5554', 'emulator-5556']);
  });

  it('omits offline and unauthorized serials', () => {
    const out = `List of devices attached
emulator-5554\tdevice
R58M30ABCDE\tunauthorized
emulator-5556\toffline
`;

    const result = parseAdbDevicesOutput(out);

    expect(result).toEqual(['emulator-5554']);
  });

  it('returns an empty list when the output has no emulators', () => {
    const out = 'List of devices attached\n\n';

    const result = parseAdbDevicesOutput(out);

    expect(result).toEqual([]);
  });

  it('parses `adb devices -l` long lines (serial is the first field)', () => {
    const out = `List of devices attached
emulator-5554   device product:sdk_gphone... model:Pixel_5_Pro
`;

    const result = parseAdbDevicesOutput(out);

    expect(result).toEqual(['emulator-5554']);
  });
});

describe('resolveAndroidAdbUdidForDevice rejection cache eviction', () => {
  beforeEach(() => {
    __clearAndroidAdbUdidCacheForTests();
    execFileMock.mockReset();
  });

  it('does not permanently cache a rejected resolution; retries succeed when adb recovers', async () => {
    let devicesCalls = 0;
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        _opts: object,
        cb: (
          err: Error | null,
          stdout?: Buffer | string,
          stderr?: Buffer | string,
        ) => void,
      ) => {
        if (cmd !== 'adb') {
          cb(new Error('unexpected cmd'));
          return;
        }
        if (args[0] === 'devices') {
          devicesCalls += 1;
          if (devicesCalls === 1) {
            cb(new Error('adb unreachable'));
            return;
          }
          cb(
            null,
            Buffer.from('List of devices attached\nemulator-5554\tdevice\n'),
          );
          return;
        }
        if (args[0] === '-s' && args[2] === 'emu') {
          cb(null, Buffer.from('RetryAvd\nOK\n'));
          return;
        }
        cb(new Error('unexpected adb args'));
      },
    );

    const device = { name: 'RetryAvd', provider: ProviderName.EMULATOR };

    await expect(resolveAndroidAdbUdidForDevice(device)).rejects.toThrow(
      'adb unreachable',
    );

    await expect(resolveAndroidAdbUdidForDevice(device)).resolves.toBe(
      'emulator-5554',
    );
    expect(devicesCalls).toBe(2);
  });
});

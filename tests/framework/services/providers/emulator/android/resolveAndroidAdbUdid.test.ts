import {
  __clearAndroidAdbUdidCacheForTests,
  parseAdbDevicesOutput,
  parseAvdNameFromEmuOutput,
} from './resolveAndroidAdbUdid';

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

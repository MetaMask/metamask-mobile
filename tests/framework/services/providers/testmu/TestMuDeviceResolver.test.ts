import {
  applyTestMuAvailabilityRegex,
  normalizeTestMuPlatformVersion,
  resolveTestMuDeviceCapabilities,
} from './TestMuDeviceResolver';

describe('TestMuDeviceResolver', () => {
  const originalExact = process.env['TESTMU_DEVICE_EXACT'];

  afterEach(() => {
    if (originalExact === undefined) {
      delete process.env['TESTMU_DEVICE_EXACT'];
    } else {
      process.env['TESTMU_DEVICE_EXACT'] = originalExact;
    }
  });

  describe('normalizeTestMuPlatformVersion', () => {
    it('strips trailing .0 from Android versions', () => {
      expect(normalizeTestMuPlatformVersion('14.0')).toBe('14');
      expect(normalizeTestMuPlatformVersion('15.0')).toBe('15');
    });

    it('keeps integer iOS versions unchanged', () => {
      expect(normalizeTestMuPlatformVersion('17')).toBe('17');
      expect(normalizeTestMuPlatformVersion('18')).toBe('18');
    });
  });

  describe('applyTestMuAvailabilityRegex', () => {
    it('appends .* so TestMu can allocate any matching device/OS', () => {
      delete process.env['TESTMU_DEVICE_EXACT'];
      expect(applyTestMuAvailabilityRegex('Pixel 7 Pro', '15')).toEqual({
        deviceName: 'Pixel 7 Pro.*',
        platformVersion: '15.*',
      });
    });

    it('keeps exact catalog names when TESTMU_DEVICE_EXACT=true', () => {
      process.env['TESTMU_DEVICE_EXACT'] = 'true';
      expect(applyTestMuAvailabilityRegex('Pixel 7 Pro', '15')).toEqual({
        deviceName: 'Pixel 7 Pro',
        platformVersion: '15',
      });
    });
  });

  describe('resolveTestMuDeviceCapabilities', () => {
    it('maps Google Pixel 7 Pro (BS 13) to TestMu Pixel 7 Pro / 15 with regex', () => {
      delete process.env['TESTMU_DEVICE_EXACT'];
      expect(
        resolveTestMuDeviceCapabilities('Google Pixel 7 Pro', '13.0'),
      ).toEqual({
        deviceName: 'Pixel 7 Pro.*',
        platformVersion: '15.*',
      });
    });

    it('maps Samsung Galaxy S25 Ultra from BrowserStack naming with availability regex', () => {
      delete process.env['TESTMU_DEVICE_EXACT'];
      expect(
        resolveTestMuDeviceCapabilities('Samsung Galaxy S25 Ultra', '15.0'),
      ).toEqual({
        deviceName: 'Galaxy S25 Ultra.*',
        platformVersion: '15.*',
      });
    });

    it('falls back to prefix stripping for unknown devices', () => {
      delete process.env['TESTMU_DEVICE_EXACT'];
      expect(resolveTestMuDeviceCapabilities('Google Pixel 6', '13.0')).toEqual(
        {
          deviceName: 'Pixel 6.*',
          platformVersion: '13.*',
        },
      );
    });
  });
});

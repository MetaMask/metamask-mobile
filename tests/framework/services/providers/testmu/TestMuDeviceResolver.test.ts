import {
  applyTestMuAvailabilityRegex,
  normalizeTestMuPlatformVersion,
  resolveTestMuCatalogDeviceName,
  resolveTestMuDeviceCapabilities,
} from './TestMuDeviceResolver';

describe('TestMuDeviceResolver', () => {
  const env = process.env;
  const originalExact = env.TESTMU_DEVICE_EXACT;

  afterEach(() => {
    if (originalExact === undefined) {
      delete env.TESTMU_DEVICE_EXACT;
    } else {
      env.TESTMU_DEVICE_EXACT = originalExact;
    }
  });

  describe('normalizeTestMuPlatformVersion', () => {
    it('strips trailing .0 from Android versions', () => {
      expect(normalizeTestMuPlatformVersion('14.0')).toBe('14');
      expect(normalizeTestMuPlatformVersion('15.0')).toBe('15');
    });

    it('keeps integer versions unchanged', () => {
      expect(normalizeTestMuPlatformVersion('14')).toBe('14');
      expect(normalizeTestMuPlatformVersion('18')).toBe('18');
    });
  });

  describe('applyTestMuAvailabilityRegex', () => {
    it('appends .* so TestMu can allocate any matching device/OS', () => {
      delete env.TESTMU_DEVICE_EXACT;
      expect(applyTestMuAvailabilityRegex('Pixel 8 Pro', '14')).toEqual({
        deviceName: 'Pixel 8 Pro.*',
        platformVersion: '14.*',
      });
    });

    it('keeps exact catalog names when TESTMU_DEVICE_EXACT=true', () => {
      env.TESTMU_DEVICE_EXACT = 'true';
      expect(applyTestMuAvailabilityRegex('Pixel 8 Pro', '14')).toEqual({
        deviceName: 'Pixel 8 Pro',
        platformVersion: '14',
      });
    });
  });

  describe('resolveTestMuCatalogDeviceName', () => {
    it('maps the current performance matrix name without regex', () => {
      expect(resolveTestMuCatalogDeviceName('Google Pixel 8 Pro')).toBe(
        'Pixel 8 Pro',
      );
    });
  });

  describe('resolveTestMuDeviceCapabilities', () => {
    it('maps Google Pixel 8 Pro (BS 14.0) to TestMu Pixel 8 Pro / 14', () => {
      delete env.TESTMU_DEVICE_EXACT;
      expect(
        resolveTestMuDeviceCapabilities('Google Pixel 8 Pro', '14.0'),
      ).toEqual({
        deviceName: 'Pixel 8 Pro.*',
        platformVersion: '14.*',
      });
    });

    it('maps Samsung Galaxy S25 Ultra from BrowserStack naming', () => {
      delete env.TESTMU_DEVICE_EXACT;
      expect(
        resolveTestMuDeviceCapabilities('Samsung Galaxy S25 Ultra', '15.0'),
      ).toEqual({
        deviceName: 'Galaxy S25 Ultra.*',
        platformVersion: '15.*',
      });
    });

    it('strips a Google prefix for unmapped devices', () => {
      delete env.TESTMU_DEVICE_EXACT;
      expect(resolveTestMuDeviceCapabilities('Google Pixel 6', '13.0')).toEqual(
        {
          deviceName: 'Pixel 6.*',
          platformVersion: '13.*',
        },
      );
    });
  });
});

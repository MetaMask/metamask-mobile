import {
  normalizeTestMuPlatformVersion,
  resolveTestMuDeviceCapabilities,
} from './TestMuDeviceResolver';

describe('TestMuDeviceResolver', () => {
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

  describe('resolveTestMuDeviceCapabilities', () => {
    it('maps Google Pixel 8 Pro from BrowserStack naming', () => {
      expect(
        resolveTestMuDeviceCapabilities('Google Pixel 8 Pro', '14.0'),
      ).toEqual({
        deviceName: 'Pixel 8 Pro',
        platformVersion: '14',
      });
    });

    it('maps Samsung Galaxy S25 Ultra from BrowserStack naming', () => {
      expect(
        resolveTestMuDeviceCapabilities('Samsung Galaxy S25 Ultra', '15.0'),
      ).toEqual({
        deviceName: 'Galaxy S25 Ultra',
        platformVersion: '15',
      });
    });

    it('falls back to prefix stripping for unknown devices', () => {
      expect(resolveTestMuDeviceCapabilities('Google Pixel 7', '13.0')).toEqual(
        {
          deviceName: 'Pixel 7',
          platformVersion: '13',
        },
      );
    });
  });
});

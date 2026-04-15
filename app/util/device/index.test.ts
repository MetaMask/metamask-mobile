import compareVersions from 'compare-versions';
import { Platform } from 'react-native';
import Device from '.';

describe('Device', () => {
  describe('isAndroid + isIos', () => {
    const originalOS = Platform.OS;
    afterEach(() => {
      Platform.OS = originalOS;
    });

    it('should return expected values when Platform.OS is "android"', () => {
      Platform.OS = 'android';
      expect(Device.isAndroid()).toBe(true);
      expect(Device.isIos()).toBe(false);
    });
  });
  describe('comparePlatformVersionTo', () => {
    const platformVersionDescriptor = Object.getOwnPropertyDescriptor(
      Platform,
      'Version',
    );

    afterEach(() => {
      if (platformVersionDescriptor) {
        Object.defineProperty(Platform, 'Version', platformVersionDescriptor);
      }
    });

    it('compares dotted platform versions with the shared compare-versions behavior', () => {
      Object.defineProperty(Platform, 'Version', {
        configurable: true,
        value: '17.3.1',
      });

      expect(Device.comparePlatformVersionTo('17.4')).toBe(
        compareVersions('17.3.1', '17.4'),
      );
    });

    it('supports Android-style numeric platform versions and numeric references', () => {
      Object.defineProperty(Platform, 'Version', {
        configurable: true,
        value: 34,
      });

      expect(Device.comparePlatformVersionTo(33)).toBe(
        compareVersions('34', '33'),
      );
    });
  });
  describe('isIpad', () => {
    it('should return true if device width/height is > 1000', () => {
      Device.getDeviceWidth = Device.getDeviceHeight = () => 1200;
      expect(Device.isIpad()).toBe(true);
    });
    it('should return false if device width/height is < 1000', () => {
      Device.getDeviceWidth = Device.getDeviceHeight = () => 900;
      expect(Device.isIpad()).toBe(false);
    });
  });
  describe('isLandscape', () => {
    it('should return true if device width > device height', () => {
      Device.getDeviceWidth = () => 1200;
      Device.getDeviceHeight = () => 900;
      expect(Device.isLandscape()).toBe(true);
    });
    it('should return false if device width < device height', () => {
      Device.getDeviceWidth = () => 900;
      Device.getDeviceHeight = () => 1200;
      expect(Device.isLandscape()).toBe(false);
    });
  });
  describe('isIphone5', () => {
    it('should return true if device width is 320', () => {
      Device.getDeviceWidth = () => 320;
      expect(Device.isIphone5()).toBe(true);
    });
    it('should return false if device width is not 320', () => {
      Device.getDeviceWidth = () => 321;
      expect(Device.isIphone5()).toBe(false);
    });
  });
  describe('isIphone5S', () => {
    it('should return true if device width is 320', () => {
      Device.getDeviceWidth = () => 320;
      expect(Device.isIphone5S()).toBe(true);
    });
    it('should return false if device width is not 320', () => {
      Device.getDeviceWidth = () => 321;
      expect(Device.isIphone5S()).toBe(false);
    });
  });
  describe('isIphoneX', () => {
    it('should return true if device width is >= 375 and height is >= 812', () => {
      Device.getDeviceWidth = () => 375;
      Device.getDeviceHeight = () => 812;
      expect(Device.isIphoneX()).toBe(true);
    });
    it('should return false if device width is < 375 and height is < 812', () => {
      Device.getDeviceWidth = () => 374;
      Device.getDeviceHeight = () => 811;
      expect(Device.isIphoneX()).toBe(false);
    });
  });
  describe('isSmallDevice', () => {
    it('should return true if device height is < 600', () => {
      Device.getDeviceHeight = () => 599;
      expect(Device.isSmallDevice()).toBe(true);
    });
    it('should return false if device height is > 600', () => {
      Device.getDeviceHeight = () => 601;
      expect(Device.isSmallDevice()).toBe(false);
    });
  });
});

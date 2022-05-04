import Device from '.';

describe('Device', () => {
  describe('isAndroid + isIos', () => {
    it('should return expected values when Platform.OS is "android"', () => {
      jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
        OS: 'android',
      }));
      expect(Device.isAndroid()).toBe(true);
      expect(Device.isIos()).toBe(false);
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

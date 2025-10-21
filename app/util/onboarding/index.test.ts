import { Dimensions } from 'react-native';
import Device from '../device';
import { getScreenDimensions } from './index';

jest.mock('../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

jest.mock('../../components/UI/WhatsNewModal', () => ({
  whatsNewList: {
    minAppVersion: '1.0.0',
    maxLastAppVersion: '2.0.0',
    onlyUpdates: false,
    slides: [],
  },
}));

jest.mock('../device', () => ({
  isSmallDevice: jest.fn(),
  isMediumDevice: jest.fn(),
  getDeviceWidth: jest.fn(() => 375),
  getDeviceHeight: jest.fn(() => 667),
}));

describe('getScreenDimensions', () => {
  const mockIsSmallDevice = Device.isSmallDevice as jest.Mock;
  const mockIsMediumDevice = Device.isMediumDevice as jest.Mock;

  let dimensionsGetSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on Dimensions.get
    dimensionsGetSpy = jest.spyOn(Dimensions, 'get');
    mockIsSmallDevice.mockReturnValue(false);
    mockIsMediumDevice.mockReturnValue(false);
  });

  afterEach(() => {
    dimensionsGetSpy.mockRestore();
  });

  it('returns screen dimensions with 0.5 animation height ratio for large devices', () => {
    // Arrange
    const windowWidth = 400;
    const windowHeight = 800;
    dimensionsGetSpy.mockReturnValue({
      width: windowWidth,
      height: windowHeight,
      scale: 1,
      fontScale: 1,
    });
    mockIsSmallDevice.mockReturnValue(false);
    mockIsMediumDevice.mockReturnValue(false);

    // Act
    const result = getScreenDimensions();

    // Assert
    expect(result).toEqual({
      screenWidth: 400,
      screenHeight: 800,
      animationHeight: 400, // 800 * 0.5
    });
    expect(dimensionsGetSpy).toHaveBeenCalledWith('window');
  });

  it('returns screen dimensions with 0.4 animation height ratio for small devices', () => {
    // Arrange
    const windowWidth = 320;
    const windowHeight = 568;
    dimensionsGetSpy.mockReturnValue({
      width: windowWidth,
      height: windowHeight,
      scale: 1,
      fontScale: 1,
    });
    mockIsSmallDevice.mockReturnValue(true);
    mockIsMediumDevice.mockReturnValue(false);

    // Act
    const result = getScreenDimensions();

    // Assert
    expect(result.screenWidth).toBe(320);
    expect(result.screenHeight).toBe(568);
    expect(result.animationHeight).toBeCloseTo(227.2, 1); // 568 * 0.4
  });

  it('returns screen dimensions with 0.4 animation height ratio for medium devices', () => {
    // Arrange
    const windowWidth = 375;
    const windowHeight = 667;
    dimensionsGetSpy.mockReturnValue({
      width: windowWidth,
      height: windowHeight,
      scale: 1,
      fontScale: 1,
    });
    mockIsSmallDevice.mockReturnValue(false);
    mockIsMediumDevice.mockReturnValue(true);

    // Act
    const result = getScreenDimensions();

    // Assert
    expect(result).toEqual({
      screenWidth: 375,
      screenHeight: 667,
      animationHeight: 266.8, // 667 * 0.4
    });
  });

  it('handles both small and medium device flags as true', () => {
    // Arrange
    const windowWidth = 320;
    const windowHeight = 568;
    dimensionsGetSpy.mockReturnValue({
      width: windowWidth,
      height: windowHeight,
      scale: 1,
      fontScale: 1,
    });
    mockIsSmallDevice.mockReturnValue(true);
    mockIsMediumDevice.mockReturnValue(true);

    // Act
    const result = getScreenDimensions();

    // Assert - Should use 0.4 ratio since small OR medium is true
    expect(result.screenWidth).toBe(320);
    expect(result.screenHeight).toBe(568);
    expect(result.animationHeight).toBeCloseTo(227.2, 1); // 568 * 0.4
  });

  it('handles landscape orientation dimensions', () => {
    // Arrange
    const windowWidth = 844;
    const windowHeight = 390;
    dimensionsGetSpy.mockReturnValue({
      width: windowWidth,
      height: windowHeight,
      scale: 1,
      fontScale: 1,
    });
    mockIsSmallDevice.mockReturnValue(false);
    mockIsMediumDevice.mockReturnValue(false);

    // Act
    const result = getScreenDimensions();

    // Assert
    expect(result).toEqual({
      screenWidth: 844,
      screenHeight: 390,
      animationHeight: 195, // 390 * 0.5
    });
  });

  it('handles tablet dimensions with large device ratio', () => {
    // Arrange
    const windowWidth = 768;
    const windowHeight = 1024;
    dimensionsGetSpy.mockReturnValue({
      width: windowWidth,
      height: windowHeight,
      scale: 1,
      fontScale: 1,
    });
    mockIsSmallDevice.mockReturnValue(false);
    mockIsMediumDevice.mockReturnValue(false);

    // Act
    const result = getScreenDimensions();

    // Assert
    expect(result).toEqual({
      screenWidth: 768,
      screenHeight: 1024,
      animationHeight: 512, // 1024 * 0.5
    });
  });

  it('calculates animation height correctly with decimal values', () => {
    // Arrange
    const windowWidth = 393;
    const windowHeight = 851;
    dimensionsGetSpy.mockReturnValue({
      width: windowWidth,
      height: windowHeight,
      scale: 1,
      fontScale: 1,
    });
    mockIsSmallDevice.mockReturnValue(true);
    mockIsMediumDevice.mockReturnValue(false);

    // Act
    const result = getScreenDimensions();

    // Assert
    expect(result.animationHeight).toBeCloseTo(340.4, 1); // 851 * 0.4
    expect(result.screenWidth).toBe(393);
    expect(result.screenHeight).toBe(851);
  });
});

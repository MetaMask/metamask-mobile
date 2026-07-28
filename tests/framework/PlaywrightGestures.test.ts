jest.mock('./playwrightLogger.ts', () => ({
  createPlaywrightLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  debugElementAction: jest.fn(),
}));

jest.mock('./PlaywrightUtilities', () => ({
  boxedStep: () => () => undefined,
  getDriver: jest.fn(),
}));

jest.mock('./PlatformLocator', () => ({
  PlatformDetector: {
    isAndroid: jest.fn(),
  },
}));

import PlaywrightGestures from './PlaywrightGestures.ts';
import { getDriver } from './PlaywrightUtilities';
import { PlatformDetector } from './PlatformLocator';

const mockedGetDriver = getDriver as jest.Mock;
const mockedIsAndroid = PlatformDetector.isAndroid as jest.Mock;

describe('PlaywrightGestures.hideKeyboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the keyboard on Android when it is shown', async () => {
    const drv = {
      isKeyboardShown: jest.fn().mockResolvedValue(true),
      hideKeyboard: jest.fn().mockResolvedValue(undefined),
    };
    mockedGetDriver.mockReturnValue(drv);
    mockedIsAndroid.mockReturnValue(true);

    await PlaywrightGestures.hideKeyboard();

    expect(drv.isKeyboardShown).toHaveBeenCalledTimes(1);
    expect(drv.hideKeyboard).toHaveBeenCalledTimes(1);
  });

  it('does not call hideKeyboard on Android when the keyboard is not shown', async () => {
    const drv = {
      isKeyboardShown: jest.fn().mockResolvedValue(false),
      hideKeyboard: jest.fn().mockResolvedValue(undefined),
    };
    mockedGetDriver.mockReturnValue(drv);
    mockedIsAndroid.mockReturnValue(true);

    await PlaywrightGestures.hideKeyboard();

    expect(drv.isKeyboardShown).toHaveBeenCalledTimes(1);
    expect(drv.hideKeyboard).not.toHaveBeenCalled();
  });

  it('swallows the Android "cannot be hidden" error without throwing', async () => {
    const drv = {
      isKeyboardShown: jest.fn().mockResolvedValue(true),
      hideKeyboard: jest
        .fn()
        .mockRejectedValue(new Error('The software keyboard cannot be hidden')),
    };
    mockedGetDriver.mockReturnValue(drv);
    mockedIsAndroid.mockReturnValue(true);

    await expect(PlaywrightGestures.hideKeyboard()).resolves.toBeUndefined();
    expect(drv.hideKeyboard).toHaveBeenCalledTimes(1);
  });

  it('uses tapOutside strategy on iOS', async () => {
    const drv = {
      isKeyboardShown: jest.fn(),
      hideKeyboard: jest.fn(),
      executeScript: jest.fn().mockResolvedValue(undefined),
    };
    mockedGetDriver.mockReturnValue(drv);
    mockedIsAndroid.mockReturnValue(false);

    await PlaywrightGestures.hideKeyboard();

    expect(drv.executeScript).toHaveBeenCalledWith('mobile: hideKeyboard', [
      { strategy: 'tapOutside' },
    ]);
    expect(drv.isKeyboardShown).not.toHaveBeenCalled();
    expect(drv.hideKeyboard).not.toHaveBeenCalled();
  });

  it('throws when the driver is not available', async () => {
    mockedGetDriver.mockReturnValue(undefined);

    await expect(PlaywrightGestures.hideKeyboard()).rejects.toThrow(
      'Driver is not available',
    );
  });
});

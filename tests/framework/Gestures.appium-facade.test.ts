/**
 * @jest-environment node
 */

jest.mock('./AppiumGestures.ts', () => ({
  __esModule: true,
  default: {
    activateApp: jest.fn().mockResolvedValue(undefined),
    terminateApp: jest.fn().mockResolvedValue(undefined),
    submitAndroidUrlBar: jest.fn().mockResolvedValue(undefined),
    swipe: jest.fn().mockResolvedValue(undefined),
  },
}));

import Gestures from './Gestures';
import AppiumGestures from './AppiumGestures';
import type { CurrentDeviceDetails } from './fixtures/playwright';

describe('Gestures Appium lifecycle facades', () => {
  const deviceDetails = {
    platform: 'android',
    packageName: 'io.metamask',
  } as CurrentDeviceDetails;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards activateApp with package id to AppiumGestures', async () => {
    await Gestures.activateApp(undefined, 'com.android.chrome');

    expect(AppiumGestures.activateApp).toHaveBeenCalledWith(
      undefined,
      'com.android.chrome',
    );
  });

  it('forwards terminateApp to AppiumGestures', async () => {
    await Gestures.terminateApp(deviceDetails);

    expect(AppiumGestures.terminateApp).toHaveBeenCalledWith(
      deviceDetails,
      undefined,
    );
  });

  it('forwards submitAndroidUrlBar to AppiumGestures', async () => {
    await Gestures.submitAndroidUrlBar();

    expect(AppiumGestures.submitAndroidUrlBar).toHaveBeenCalledTimes(1);
  });

  it('forwards swipeScreen to AppiumGestures.swipe', async () => {
    const options = {
      scrollParams: { direction: 'down' as const },
      duration: 100,
      from: { x: 100, y: 300 },
      to: { x: 100, y: 1700 },
      percent: 0.5,
    };

    await Gestures.swipeScreen(options);

    expect(AppiumGestures.swipe).toHaveBeenCalledWith(options);
  });
});

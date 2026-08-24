/**
 * @jest-environment node
 */

jest.mock('./PlaywrightGestures.ts', () => ({
  __esModule: true,
  default: {
    activateApp: jest.fn().mockResolvedValue(undefined),
    terminateApp: jest.fn().mockResolvedValue(undefined),
    submitAndroidUrlBar: jest.fn().mockResolvedValue(undefined),
    swipe: jest.fn().mockResolvedValue(undefined),
  },
}));

import Gestures from './Gestures';
import PlaywrightGestures from './PlaywrightGestures';
import type { CurrentDeviceDetails } from './fixtures/playwright';

describe('Gestures Appium lifecycle facades', () => {
  const deviceDetails = {
    platform: 'android',
    packageName: 'io.metamask',
  } as CurrentDeviceDetails;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards activateApp with package id to PlaywrightGestures', async () => {
    await Gestures.activateApp(undefined, 'com.android.chrome');

    expect(PlaywrightGestures.activateApp).toHaveBeenCalledWith(
      undefined,
      'com.android.chrome',
    );
  });

  it('forwards terminateApp to PlaywrightGestures', async () => {
    await Gestures.terminateApp(deviceDetails);

    expect(PlaywrightGestures.terminateApp).toHaveBeenCalledWith(
      deviceDetails,
      undefined,
    );
  });

  it('forwards submitAndroidUrlBar to PlaywrightGestures', async () => {
    await Gestures.submitAndroidUrlBar();

    expect(PlaywrightGestures.submitAndroidUrlBar).toHaveBeenCalledTimes(1);
  });

  it('forwards swipeScreen to PlaywrightGestures.swipe', async () => {
    const options = {
      scrollParams: { direction: 'down' as const },
      duration: 100,
      from: { x: 100, y: 300 },
      to: { x: 100, y: 1700 },
      percent: 0.5,
    };

    await Gestures.swipeScreen(options);

    expect(PlaywrightGestures.swipe).toHaveBeenCalledWith(options);
  });
});

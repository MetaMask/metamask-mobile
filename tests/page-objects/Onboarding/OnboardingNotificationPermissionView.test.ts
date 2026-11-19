import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import OnboardingNotificationPermissionView from './OnboardingNotificationPermissionView';
import { PlatformDetector } from '../../framework/PlatformLocator';

jest.mock('../../framework/Matchers', () => ({
  getElementByID: jest.fn(),
  getElementByAndroidUIAutomator: jest.fn(),
}));
jest.mock('../../framework/PlatformLocator', () => ({
  PlatformDetector: { isAndroid: jest.fn() },
}));
jest.mock('../../framework/Gestures', () => ({
  waitAndTap: jest.fn(),
}));
jest.mock('../../framework/Assertions', () => ({
  expectElementToNotExist: jest.fn(),
}));

it.each(['skip', 'enable'] as const)(
  'checks removal of the tapped %s element without looking it up after navigation',
  async (action) => {
    jest.clearAllMocks();
    const button = { unwrap: jest.fn() };
    jest
      .mocked(Matchers.getElementByID)
      .mockResolvedValueOnce(
        button as unknown as Awaited<
          ReturnType<typeof Matchers.getElementByID>
        >,
      )
      .mockRejectedValue(new Error('Route has unmounted'));

    await OnboardingNotificationPermissionView[action]();

    expect(Matchers.getElementByID).toHaveBeenCalledTimes(1);
    expect(Gestures.waitAndTap).toHaveBeenCalledWith(
      button,
      expect.any(Object),
    );
    expect(Assertions.expectElementToNotExist).toHaveBeenCalledWith(
      button,
      expect.any(Object),
    );
  },
);

it.each([true, false])(
  'answers the native prompt before checking completion only on Android: %s',
  async (isAndroid) => {
    jest.clearAllMocks();
    jest.mocked(PlatformDetector.isAndroid).mockReturnValue(isAndroid);
    const button = { unwrap: jest.fn() };
    jest
      .mocked(Matchers.getElementByID)
      .mockResolvedValue(
        button as unknown as Awaited<
          ReturnType<typeof Matchers.getElementByID>
        >,
      );

    await OnboardingNotificationPermissionView.enable({
      expectNativePrompt: true,
    });

    expect(Gestures.waitAndTap).toHaveBeenCalledTimes(isAndroid ? 2 : 1);
    if (isAndroid) {
      expect(Matchers.getElementByAndroidUIAutomator).toHaveBeenCalledWith(
        '.resourceIdMatches(".*:id/permission_allow_button")',
      );
      expect(
        jest.mocked(Gestures.waitAndTap).mock.invocationCallOrder[1],
      ).toBeLessThan(
        jest.mocked(Assertions.expectElementToNotExist).mock
          .invocationCallOrder[0],
      );
    } else {
      expect(Matchers.getElementByAndroidUIAutomator).not.toHaveBeenCalled();
    }
  },
);

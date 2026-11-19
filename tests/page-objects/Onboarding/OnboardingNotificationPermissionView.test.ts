import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import OnboardingNotificationPermissionView from './OnboardingNotificationPermissionView';

jest.mock('../../framework/Matchers', () => ({
  getElementByID: jest.fn(),
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

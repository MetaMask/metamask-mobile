import { NavigationContainerRef } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-hooks';
import useNotificationHandler from './index';
// eslint-disable-next-line import/no-namespace
import * as UseRegisterPushNotificationsEffect from './useRegisterPushNotificationsEffect';
// eslint-disable-next-line import/no-namespace
import * as UseNotifications from './useNotifications';

describe('useNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const mockNavigate = jest.fn();
    const mockNavigation = {
      navigate: mockNavigate,
    } as unknown as NavigationContainerRef;

    const mockUseRegisterPushNotificationsEffect = jest
      .spyOn(
        UseRegisterPushNotificationsEffect,
        'useRegisterPushNotificationsEffect',
      )
      .mockImplementation(jest.fn());

    const mockUseListNotificationsEffect = jest
      .spyOn(UseNotifications, 'useListNotificationsEffect')
      .mockImplementation(jest.fn());

    return {
      mockNavigation,
      mockUseRegisterPushNotificationsEffect,
      mockUseListNotificationsEffect,
    };
  };

  it('invokes the push notifications effect', async () => {
    const mocks = arrangeMocks();
    renderHook(() => useNotificationHandler());

    expect(mocks.mockUseRegisterPushNotificationsEffect).toHaveBeenCalled();
    expect(mocks.mockUseListNotificationsEffect).toHaveBeenCalled();
  });
});

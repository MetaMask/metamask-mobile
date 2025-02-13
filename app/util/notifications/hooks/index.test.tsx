import { NavigationContainerRef } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-hooks';
import useNotificationHandler from './index';
// eslint-disable-next-line import/no-namespace
import * as UseRegisterPushNotificationsEffect from './useRegisterPushNotificationsEffect';

describe('useNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const mockNavigate = jest.fn();
    const mockNavigation = {
      navigate: mockNavigate,
    } as unknown as NavigationContainerRef;

    const mockUseRegisterPushNotificationsEffect = jest.spyOn(
      UseRegisterPushNotificationsEffect,
      'useRegisterPushNotificationsEffect',
    );

    return { mockNavigation, mockUseRegisterPushNotificationsEffect };
  };

  it('invokes the push notifications effect', () => {
    const mocks = arrangeMocks();
    renderHook(() => useNotificationHandler(mocks.mockNavigation));

    expect(mocks.mockUseRegisterPushNotificationsEffect).toHaveBeenCalled();
  });
});

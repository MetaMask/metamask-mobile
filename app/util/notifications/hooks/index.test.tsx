import { NavigationContainerRef } from '@react-navigation/native';
import type { RootParamList } from '../../../types/navigation';
import { renderHook } from '@testing-library/react-hooks';
import useNotificationHandler from './index';
// eslint-disable-next-line import/no-namespace
import * as UseNotifications from './useStartupNotificationsEffect';

describe('useNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const mockNavigate = jest.fn();
    const mockNavigation = {
      navigate: mockNavigate,
    } as unknown as NavigationContainerRef<RootParamList>;

    const mockUseListNotificationsEffect = jest
      .spyOn(UseNotifications, 'useStartupNotificationsEffect')
      .mockImplementation(jest.fn());

    return {
      mockNavigation,
      mockUseListNotificationsEffect,
    };
  };

  it('invokes the push notifications effect', async () => {
    const mocks = arrangeMocks();
    renderHook(() => useNotificationHandler());

    expect(mocks.mockUseListNotificationsEffect).toHaveBeenCalled();
  });
});

import { act } from '@testing-library/react-native';
import notifee, { type AuthorizationStatus } from '@notifee/react-native';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';

export const setPushPermissionStatus = (status: AuthorizationStatus): void => {
  jest.spyOn(notifee, 'getNotificationSettings').mockResolvedValue({
    authorizationStatus: status,
  } as Awaited<ReturnType<typeof notifee.getNotificationSettings>>);
};

export const mockOpenSystemSettings = (): (() => void) => {
  const openSettings =
    Platform.OS === 'ios'
      ? jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
      : jest.spyOn(notifee, 'openNotificationSettings');
  return () => {
    expect(openSettings).toHaveBeenCalledTimes(1);
  };
};

export const mockAppResume = (): (() => Promise<void>) => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });

  return async () => {
    await act(async () => {
      appStateListener?.('active');
    });
  };
};

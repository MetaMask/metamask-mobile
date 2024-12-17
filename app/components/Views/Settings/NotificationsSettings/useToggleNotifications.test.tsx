import { renderHook, act } from '@testing-library/react-hooks';
import { useToggleNotifications } from './useToggleNotifications';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import Routes from '../../../../constants/navigation/Routes';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    getAllPermissions: jest.fn(),
  }),
);

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

const mockDisableNotifications = jest.fn();
const mockEnableNotifications = jest.fn();
const mockSetUiNotificationStatus = jest.fn();

describe('useToggleNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to basic functionality screen if basic functionality is disabled', async () => {
    const { result } = renderHook(() =>
      useToggleNotifications({
        navigation: mockNavigation,
        basicFunctionalityEnabled: false,
        isMetamaskNotificationsEnabled: false,
        isProfileSyncingEnabled: false,
        disableNotifications: mockDisableNotifications,
        enableNotifications: mockEnableNotifications,
        setUiNotificationStatus: mockSetUiNotificationStatus,
      }),
    );

    await act(async () => {
      await result.current.toggleNotificationsEnabled();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        params: {
          caller: Routes.SETTINGS.NOTIFICATIONS,
        },
      },
    );
  });

  it('switches notifications OFF if notifications previously enabled', async () => {
    const { result } = renderHook(() =>
      useToggleNotifications({
        navigation: mockNavigation,
        basicFunctionalityEnabled: true,
        isMetamaskNotificationsEnabled: true,
        isProfileSyncingEnabled: false,
        disableNotifications: mockDisableNotifications,
        enableNotifications: mockEnableNotifications,
        setUiNotificationStatus: mockSetUiNotificationStatus,
      }),
    );

    await act(async () => {
      await result.current.toggleNotificationsEnabled();
    });

    expect(mockDisableNotifications).toHaveBeenCalled();
    expect(mockSetUiNotificationStatus).toHaveBeenCalledWith(false);
  });

  it('switches notifications ON if notifications previously disabled and permission is authorized', async () => {
    (NotificationsService.getAllPermissions as jest.Mock).mockResolvedValue({
      permission: 'authorized',
    });

    const { result } = renderHook(() =>
      useToggleNotifications({
        navigation: mockNavigation,
        basicFunctionalityEnabled: true,
        isMetamaskNotificationsEnabled: false,
        isProfileSyncingEnabled: false,
        disableNotifications: mockDisableNotifications,
        enableNotifications: mockEnableNotifications,
        setUiNotificationStatus: mockSetUiNotificationStatus,
      }),
    );

    await act(async () => {
      await result.current.toggleNotificationsEnabled();
    });

    expect(mockEnableNotifications).toHaveBeenCalled();
    expect(mockSetUiNotificationStatus).toHaveBeenCalledWith(true);
  });

  it('switches notifications OFF if device permission is not authorized', async () => {
    (NotificationsService.getAllPermissions as jest.Mock).mockResolvedValue({
      permission: 'denied',
    });

    const { result } = renderHook(() =>
      useToggleNotifications({
        navigation: mockNavigation,
        basicFunctionalityEnabled: true,
        isMetamaskNotificationsEnabled: false,
        isProfileSyncingEnabled: false,
        disableNotifications: mockDisableNotifications,
        enableNotifications: mockEnableNotifications,
        setUiNotificationStatus: mockSetUiNotificationStatus,
      }),
    );

    await act(async () => {
      await result.current.toggleNotificationsEnabled();
    });

    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(mockSetUiNotificationStatus).not.toHaveBeenCalled();
  });
});

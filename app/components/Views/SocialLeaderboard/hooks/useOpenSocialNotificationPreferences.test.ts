import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useOpenSocialNotificationPreferences } from './useOpenSocialNotificationPreferences';
import Routes from '../../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationStoragePreferences } from '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock(
  '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences',
);

const mockNavigate = jest.fn();
const mockUseNotificationStoragePreferences =
  useNotificationStoragePreferences as jest.MockedFunction<
    typeof useNotificationStoragePreferences
  >;

const setPreferences = (overrides: {
  hasNotificationPreferences?: boolean;
  isLoading?: boolean;
}) => {
  mockUseNotificationStoragePreferences.mockReturnValue({
    hasNotificationPreferences: true,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useNotificationStoragePreferences>);
};

describe('useOpenSocialNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  });

  it('does not navigate while the stored preferences are still loading', () => {
    setPreferences({ isLoading: true });

    const { result } = renderHook(() => useOpenSocialNotificationPreferences());
    result.current.openNotificationPreferences();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes to top-level notification settings when no preferences exist', () => {
    setPreferences({ hasNotificationPreferences: false });

    const { result } = renderHook(() => useOpenSocialNotificationPreferences());
    result.current.openNotificationPreferences();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
    });
  });

  it('routes to the Social AI section when preferences exist', () => {
    setPreferences({ hasNotificationPreferences: true });

    const { result } = renderHook(() => useOpenSocialNotificationPreferences());
    result.current.openNotificationPreferences();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      params: expect.objectContaining({
        categoryId: 'socialAI',
        ausKeys: ['socialAI'],
      }),
    });
  });
});

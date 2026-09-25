import { handleNotificationsSettingsUrl } from '../handleNotificationsSettingsUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../NavigationService');

describe('handleNotificationsSettingsUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;
  });

  it('navigates to the notification settings main page when no section is provided', () => {
    handleNotificationsSettingsUrl({ notificationsSettingsPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
      params: undefined,
    });
  });

  it('passes the section query param through to the notification settings page', () => {
    handleNotificationsSettingsUrl({
      notificationsSettingsPath: '?section=wallet-activity',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
      params: { section: 'wallet-activity' },
    });
  });

  it('passes price-alerts through as the section param', () => {
    handleNotificationsSettingsUrl({
      notificationsSettingsPath: '?section=price-alerts',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
      params: { section: 'price-alerts' },
    });
  });

  it('passes unknown section values through so the settings page can fall back', () => {
    handleNotificationsSettingsUrl({
      notificationsSettingsPath: '?section=not-a-section',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
      params: { section: 'not-a-section' },
    });
  });

  it('ignores unrelated params', () => {
    handleNotificationsSettingsUrl({
      notificationsSettingsPath: '?foo=bar',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
      params: undefined,
    });
  });
});

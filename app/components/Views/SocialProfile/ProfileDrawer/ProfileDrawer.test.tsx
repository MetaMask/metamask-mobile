import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';

import ProfileDrawer from './ProfileDrawer';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ProfileDrawerSelectorsIDs } from './ProfileDrawer.testIds';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants/config';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../../util/notifications/constants/config', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

const mockIsNotificationsFeatureEnabled = jest.mocked(
  isNotificationsFeatureEnabled,
);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

/** State carrying `unreadCount` unread notifications plus one read one. */
const stateWithNotifications = (
  unreadCount: number,
  { isEnabled = true }: { isEnabled?: boolean } = {},
) => ({
  engine: {
    backgroundState: {
      NotificationServicesController: {
        isNotificationServicesEnabled: isEnabled,
        metamaskNotificationsList: [
          ...Array.from({ length: unreadCount }, (_, index) => ({
            id: `unread-${index}`,
            isRead: false,
          })),
          { id: 'read-1', isRead: true },
        ],
      },
    },
  },
});

describe('ProfileDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
  });

  it('wraps content in SafeAreaView', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    expect(getByTestId(ProfileDrawerSelectorsIDs.SAFE_AREA)).toBeOnTheScreen();
  });

  it('renders the close and scan header buttons', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    expect(
      getByTestId(ProfileDrawerSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ProfileDrawerSelectorsIDs.SCAN_BUTTON),
    ).toBeOnTheScreen();
  });

  it('insets the header buttons from the screen edges', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    expect(getByTestId(ProfileDrawerSelectorsIDs.HEADER)).toHaveStyle({
      paddingLeft: 16,
      paddingRight: 16,
    });
  });

  it('navigates back when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.CLOSE_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the QR scanner camera view when the scan button is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.SCAN_BUTTON));

    // The handler comes from `useQRScanner`.
    expect(mockNavigate).toHaveBeenCalledWith(Routes.QR_TAB_SWITCHER, {
      onScanSuccess: expect.any(Function),
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('renders the create profile call to action with its avatar', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    const createProfile = getByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE);

    expect(createProfile).toBeOnTheScreen();
    expect(
      getByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE_AVATAR),
    ).toBeOnTheScreen();
    expect(
      within(createProfile).getByText(
        strings('app_settings.profile_drawer.create_profile'),
      ),
    ).toBeOnTheScreen();
  });

  it('navigates to edit profile when the create profile header is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_PROFILE.EDIT_PROFILE,
    );
  });

  it('navigates to the notifications screen when the notifications row is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.NOTIFICATIONS.VIEW);
  });

  it('navigates to notifications even when the badge is hidden', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: stateWithNotifications(0, { isEnabled: false }),
    });

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.NOTIFICATIONS.VIEW);
  });

  it('navigates to the settings list when the settings row is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.SETTINGS_ROW));

    // SettingsFlow opens on the accounts menu, so the nested screen is named.
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.ROOT,
    });
  });

  it('navigates to the activity screen when the activity row is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.ACTIVITY_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: { entryPoint: ActivityScreenEntryPoint.ProfileDrawer },
    });
  });

  it.each([
    [
      ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW,
      'app_settings.profile_drawer.notifications',
    ],
    [
      ProfileDrawerSelectorsIDs.ACTIVITY_ROW,
      'app_settings.profile_drawer.activity',
    ],
    [
      ProfileDrawerSelectorsIDs.SUBSCRIPTIONS_ROW,
      'app_settings.profile_drawer.subscriptions',
    ],
    [
      ProfileDrawerSelectorsIDs.SETTINGS_ROW,
      'app_settings.profile_drawer.settings',
    ],
    [
      ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW,
      'app_settings.profile_drawer.help_and_support',
    ],
  ])('renders the %s menu row with its label', (testID, labelKey) => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    const row = getByTestId(testID);

    expect(within(row).getByText(strings(labelKey))).toBeOnTheScreen();
  });

  it('badges the notifications row with the unread count from state', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: stateWithNotifications(3),
    });

    const notificationsRow = getByTestId(
      ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW,
    );

    expect(within(notificationsRow).getByText('3')).toBeOnTheScreen();
  });

  it('badges only the notifications row', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: stateWithNotifications(3),
    });

    const activityRow = getByTestId(ProfileDrawerSelectorsIDs.ACTIVITY_ROW);

    expect(within(activityRow).queryByText('3')).toBeNull();
  });

  it('shows no badge when notifications are switched off, however many are unread', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: stateWithNotifications(150, { isEnabled: false }),
    });

    const notificationsRow = getByTestId(
      ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW,
    );

    // The stale list would otherwise surface as a "99+" badge.
    expect(within(notificationsRow).queryByText('99+')).toBeNull();
    expect(
      within(notificationsRow).getByText(
        strings('app_settings.profile_drawer.notifications'),
      ),
    ).toBeOnTheScreen();
  });

  it('caps the badge at 99+ when notifications are on', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: stateWithNotifications(150),
    });

    expect(
      within(
        getByTestId(ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW),
      ).getByText('99+'),
    ).toBeOnTheScreen();
  });

  it('shows no badge when the notifications feature is off', () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);

    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: stateWithNotifications(150),
    });

    expect(
      within(
        getByTestId(ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW),
      ).queryByText('99+'),
    ).toBeNull();
  });

  it('shows no badge when every notification is read', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: stateWithNotifications(0),
    });

    const notificationsRow = getByTestId(
      ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW,
    );

    expect(within(notificationsRow).queryByText('0')).toBeNull();
  });

  it('renders without a badge when there are no notifications at all', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />, {
      state: {
        engine: {
          backgroundState: {
            NotificationServicesController: {
              metamaskNotificationsList: [],
            },
          },
        },
      },
    });

    const notificationsRow = getByTestId(
      ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW,
    );

    expect(
      within(notificationsRow).getByText(
        strings('app_settings.profile_drawer.notifications'),
      ),
    ).toBeOnTheScreen();
    expect(within(notificationsRow).queryByText('0')).toBeNull();
  });

  it.each([
    [ProfileDrawerSelectorsIDs.SUBSCRIPTIONS_ROW],
    [ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW],
  ])('leaves the not-yet-wired %s row inert', (testID) => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(testID));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

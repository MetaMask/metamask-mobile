import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';

import ProfileDrawer from './ProfileDrawer';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ProfileDrawerSelectorsIDs } from './ProfileDrawer.testIds';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants/config';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import { useMyProfile } from '../../SocialLeaderboard/MyProfileView/hooks/useMyProfile';
/* eslint-enable import-x/no-restricted-paths */
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../../UI/Money/constants/moneyEvents';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../../util/notifications/constants/config', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

const mockIsNotificationsFeatureEnabled = jest.mocked(
  isNotificationsFeatureEnabled,
);
const mockUseMyProfile = jest.mocked(useMyProfile);

const profileResult = (
  profile: ReturnType<typeof useMyProfile>['profile'],
  isLoading = false,
): ReturnType<typeof useMyProfile> => ({
  profile,
  isLoading,
  error: null,
  refresh: jest.fn(),
});

const flattenStyle = (node: {
  props: { style?: StyleProp<TextStyle> };
}): TextStyle => StyleSheet.flatten(node.props.style);

jest.mock('../../SocialLeaderboard/MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: jest.fn(),
}));

const mockUseProSubscriptionEnabled = jest.fn(() => ({
  isProSubscriptionEnabled: false,
}));
jest.mock('../../../../hooks/useProSubscriptionEnabled', () => ({
  useProSubscriptionEnabled: () => mockUseProSubscriptionEnabled(),
}));

const mockUseHasProMembership = jest.fn(() => false);
jest.mock('../../../../hooks/useHasProMembership', () => ({
  useHasProMembership: () => mockUseHasProMembership(),
}));

const mockTrackButtonClicked = jest.fn();
jest.mock('../../../UI/Money/hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: () => ({
    trackButtonClicked: mockTrackButtonClicked,
  }),
}));

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
    mockUseMyProfile.mockReturnValue(profileResult(null));
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
    });
    mockUseHasProMembership.mockReturnValue(false);
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
      within(createProfile).getByText(strings('profile_drawer.create_profile')),
    ).toBeOnTheScreen();
  });

  it('navigates to social v1 onboarding when create profile is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('hides create profile while the profile is still loading', () => {
    mockUseMyProfile.mockReturnValue(profileResult(null, true));

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ProfileDrawer />,
    );

    expect(
      getByTestId(ProfileDrawerSelectorsIDs.PROFILE_LOADING),
    ).toBeOnTheScreen();
    expect(queryByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE)).toBeNull();
    expect(
      queryByTestId(ProfileDrawerSelectorsIDs.PROFILE_IDENTITY),
    ).toBeNull();
  });

  it('sizes the loading placeholder like the create profile block so the menu rows do not shift', () => {
    mockUseMyProfile.mockReturnValue(profileResult(null, true));
    const loadingView = renderWithProvider(<ProfileDrawer />);
    const loadingContainerStyle = flattenStyle(
      loadingView.getByTestId(ProfileDrawerSelectorsIDs.PROFILE_LOADING),
    );
    // Skeleton hides its children from screen readers.
    const loadingAvatarStyle = flattenStyle(
      loadingView.getByTestId(
        ProfileDrawerSelectorsIDs.PROFILE_LOADING_AVATAR,
        { includeHiddenElements: true },
      ),
    );
    const loadingHeadingStyle = flattenStyle(
      loadingView.getByTestId(
        ProfileDrawerSelectorsIDs.PROFILE_LOADING_HEADING,
        { includeHiddenElements: true },
      ),
    );
    loadingView.unmount();
    mockUseMyProfile.mockReturnValue(profileResult(null));

    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    const createProfile = getByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE);
    expect(createProfile).toHaveStyle({
      paddingTop: loadingContainerStyle.paddingTop,
      paddingBottom: loadingContainerStyle.paddingBottom,
    });
    expect(
      getByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE_AVATAR),
    ).toHaveStyle({
      width: loadingAvatarStyle.width,
      height: loadingAvatarStyle.height,
    });
    expect(
      within(createProfile).getByText(strings('profile_drawer.create_profile')),
    ).toHaveStyle({
      fontSize: loadingHeadingStyle.fontSize,
      lineHeight: loadingHeadingStyle.lineHeight,
    });
  });

  it('renders the handle and foxicon when a profile exists', () => {
    mockUseMyProfile.mockReturnValue(
      profileResult({
        profileId: 'profile-1',
        displayName: 'Bonk Player',
        handle: 'bonk-player',
        imageUrl: null,
        avatarPresetId: 'astronaut',
        avatarBackgroundId: 'sky',
        shareUrl: 'https://metamask.io/social/bonk-player',
      }),
    );

    const { getByTestId, queryByTestId, queryByText } = renderWithProvider(
      <ProfileDrawer />,
    );

    expect(
      getByTestId(ProfileDrawerSelectorsIDs.PROFILE_HANDLE),
    ).toHaveTextContent('@bonk-player');
    expect(queryByText('Account 1')).toBeNull();
    expect(
      getByTestId(`${ProfileDrawerSelectorsIDs.PROFILE_AVATAR}-art`),
    ).toHaveProp('name', 'astro');
    expect(queryByTestId(ProfileDrawerSelectorsIDs.CREATE_PROFILE)).toBeNull();
  });

  it('opens the signed-in social v1 profile when the identity is pressed', () => {
    mockUseMyProfile.mockReturnValue(
      profileResult({
        profileId: 'profile-1',
        displayName: 'Bonk Player',
        handle: 'bonk-player',
        imageUrl: 'foxicon://astronaut/sky',
        shareUrl: 'https://metamask.io/social/bonk-player',
      }),
    );

    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.PROFILE_IDENTITY));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      undefined,
      {},
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

  it('navigates to the accounts menu when the settings row is pressed', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.SETTINGS_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.ACCOUNTS_MENU_VIEW,
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
      'profile_drawer.notifications',
    ],
    [ProfileDrawerSelectorsIDs.ACTIVITY_ROW, 'profile_drawer.activity'],
    [ProfileDrawerSelectorsIDs.SETTINGS_ROW, 'profile_drawer.settings'],
    [
      ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW,
      'profile_drawer.help_and_support',
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
        strings('profile_drawer.notifications'),
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
        strings('profile_drawer.notifications'),
      ),
    ).toBeOnTheScreen();
    expect(within(notificationsRow).queryByText('0')).toBeNull();
  });

  it('leaves the not-yet-wired help and support row inert', () => {
    const { getByTestId } = renderWithProvider(<ProfileDrawer />);

    fireEvent.press(
      getByTestId(ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  describe('MetaMask Orange row', () => {
    it('stays hidden while the Orange flow is off', () => {
      const { queryByTestId } = renderWithProvider(<ProfileDrawer />);

      expect(
        queryByTestId(ProfileDrawerSelectorsIDs.METAMASK_ORANGE),
      ).toBeNull();
    });

    it('shows the join label while membership access is unresolved', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
      });
      mockUseHasProMembership.mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<ProfileDrawer />);

      fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.METAMASK_ORANGE));

      expect(
        within(
          getByTestId(ProfileDrawerSelectorsIDs.METAMASK_ORANGE),
        ).getByText(strings('accounts_menu.join_metamask_orange')),
      ).toBeOnTheScreen();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_SUBSCRIPTION.ROOT, {
        source: 'accounts_menu',
      });
    });

    it('invites a non-member to join and opens the subscription flow', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
      });

      const { getByTestId } = renderWithProvider(<ProfileDrawer />);

      fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.METAMASK_ORANGE));

      expect(
        within(
          getByTestId(ProfileDrawerSelectorsIDs.METAMASK_ORANGE),
        ).getByText(strings('accounts_menu.join_metamask_orange')),
      ).toBeOnTheScreen();
      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GET_PRO,
        component_name: COMPONENT_NAMES.ACCOUNTS_MENU_ORANGE,
        label_key: 'accounts_menu.join_metamask_orange',
        redirect_target: SCREEN_NAMES.PRO_SUBSCRIPTION,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_SUBSCRIPTION.ROOT, {
        source: 'accounts_menu',
      });
    });

    it('labels a member MetaMask Orange and opens the hub', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
      });
      mockUseHasProMembership.mockReturnValue(true);

      const { getByTestId } = renderWithProvider(<ProfileDrawer />);

      fireEvent.press(getByTestId(ProfileDrawerSelectorsIDs.METAMASK_ORANGE));

      expect(
        within(
          getByTestId(ProfileDrawerSelectorsIDs.METAMASK_ORANGE),
        ).getByText(strings('accounts_menu.metamask_orange')),
      ).toBeOnTheScreen();
      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.OPEN_PRO_HUB,
        component_name: COMPONENT_NAMES.ACCOUNTS_MENU_ORANGE,
        label_key: 'accounts_menu.metamask_orange',
        redirect_target: SCREEN_NAMES.PRO_HUB,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT, {
        source: 'accounts_menu',
      });
    });
  });
});

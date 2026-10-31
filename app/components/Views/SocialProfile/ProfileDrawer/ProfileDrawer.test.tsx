import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';

import ProfileDrawer from './ProfileDrawer';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ProfileDrawerSelectorsIDs } from './ProfileDrawer.testIds';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants/config';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import { useMyProfile } from '../../SocialLeaderboard/MyProfileView/hooks/useMyProfile';
/* eslint-enable import-x/no-restricted-paths */
jest.mock('../../SocialLeaderboard/terms/socialTermsAcceptance');
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../../UI/Money/constants/moneyEvents';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(() => ({ name: 'test-event' })),
}));
const mockOpenSupportWithConsent = jest.fn();
const mockGetBetaSupportUrl = jest.fn();

jest.mock('../../../../util/notifications/constants/config', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

// Mocking the helper (rather than the inline `///: ONLY_INCLUDE_IF(beta)` fence)
// lets Jest exercise both the beta and consent branches, since babel-jest
// leaves the fence as a comment. Mirrors AccountsMenu.test.
jest.mock('../../../../util/support/betaSupportUrl', () => ({
  getBetaSupportUrl: () => mockGetBetaSupportUrl(),
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

  describe('Help and support row', () => {
    beforeEach(() => {
      mockGetBetaSupportUrl.mockReturnValue('');
    });

    // Mirrors the Accounts Menu support row so both surfaces behave the same.
    it('opens the consent flow instead of navigating directly', () => {
      const { getByTestId } = renderWithProvider(<ProfileDrawer />);

      fireEvent.press(
        getByTestId(ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW),
      );

      expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
        expect.any(Function),
        METAMASK_SUPPORT_URL,
        expect.any(Function),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('defers NAVIGATION_TAPS_GET_HELP tracking until support opens', () => {
      const { getByTestId } = renderWithProvider(<ProfileDrawer />);

      fireEvent.press(
        getByTestId(ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW),
      );

      // Pressing the row only opens the consent sheet; tracking waits until the
      // user confirms/rejects and support actually opens.
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP,
      );

      const onOpenSupport = mockOpenSupportWithConsent.mock.calls[0][2];
      onOpenSupport();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('opens the enriched support URL in the simple webview once consented', () => {
      const { getByTestId } = renderWithProvider(<ProfileDrawer />);

      fireEvent.press(
        getByTestId(ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW),
      );

      const open = mockOpenSupportWithConsent.mock.calls[0][0];
      open('https://support.metamask.io/?customer_service_token=jwt-token');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url: 'https://support.metamask.io/?customer_service_token=jwt-token',
          title: strings('app_settings.contact_support'),
        },
      });
    });

    describe('on a beta build', () => {
      beforeEach(() => {
        mockGetBetaSupportUrl.mockReturnValue(
          'https://intercom.help/internal-beta-testing/en/',
        );
      });

      it('skips the consent sheet and opens the beta help center', () => {
        const { getByTestId } = renderWithProvider(<ProfileDrawer />);

        fireEvent.press(
          getByTestId(ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW),
        );

        expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url: 'https://intercom.help/internal-beta-testing/en/',
            title: strings('app_settings.contact_support'),
          },
        });
      });

      it('tracks NAVIGATION_TAPS_GET_HELP on press', () => {
        const { getByTestId } = renderWithProvider(<ProfileDrawer />);

        fireEvent.press(
          getByTestId(ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW),
        );

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP,
        );
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });
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

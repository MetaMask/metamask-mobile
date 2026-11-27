/**
 * Component-view tests for the Settings trading-signals section.
 *
 * The section unit test replaces this content with null, and the content unit
 * test mocks `useNotificationPreferences`. These cases drive the AUS
 * preferences read/write and `SocialService:fetchFollowing` through the
 * rendered switches.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/Settings/NotificationsSettings/SocialAINotificationSettings.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type { FollowingResponse } from '@metamask/social-controllers';
import { AuthorizationStatus } from '@notifee/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  clearLeaderboardApiMock,
  getLeaderboardMessengerSpy,
  setupLeaderboardApiMock,
} from '../../../../../tests/component-view/api-mocking/socialLeaderboard';
import {
  mockAppResume,
  mockOpenSystemSettings,
  setPushPermissionStatus,
} from '../../../../../tests/component-view/helpers/notificationSettings';
import { renderSocialAINotificationSettingsSection } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
// eslint-disable-next-line import-x/no-restricted-paths -- test ids live with the social preferences UI this settings section renders
import { NotificationPreferencesSelectorsIDs } from '../../SocialLeaderboard/NotificationPreferences/NotificationPreferences.testIds';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

const PUT_NOTIFICATION_PREFERENCES =
  'AuthenticatedUserStorageService:putNotificationPreferences';

const FOLLOWED: FollowingResponse['following'] = [
  {
    profileId: 'trader-1',
    address: '0x0000000000000000000000000000000000000001',
    name: 'alpha.eth',
    imageUrl: 'https://example.com/avatar1.png',
  },
  {
    profileId: 'trader-2',
    address: '0x0000000000000000000000000000000000000002',
    name: 'beta.eth',
    imageUrl: null,
  },
];

const FOLLOWED_IDS = FOLLOWED.map((trader) => trader.profileId);

const threshold = (amount: number) =>
  NotificationPreferencesSelectorsIDs.THRESHOLD_OPTION(amount);

const traderToggle = (traderId: string) =>
  NotificationPreferencesSelectorsIDs.TRADER_TOGGLE(traderId);

/** iOS exposes `value`; Android exposes `on`. */
const isSwitchOn = (testId: string): boolean => {
  const props = screen.getByTestId(testId).props;
  if (typeof props.on === 'boolean') {
    return props.on;
  }
  return props.value === true;
};

const isThresholdChecked = (amount: number): boolean =>
  screen.getByTestId(threshold(amount)).props.accessibilityState?.checked ===
  true;

const isThresholdDisabled = (amount: number): boolean =>
  screen.getByTestId(threshold(amount)).props.accessibilityState?.disabled ===
  true;

const renderSection = () => {
  setupLeaderboardApiMock({ following: FOLLOWED });
  return renderSocialAINotificationSettingsSection({
    presetOptions: { followingProfileIds: FOLLOWED_IDS },
  });
};

describeForPlatforms('Social AI notification settings', () => {
  beforeEach(() => {
    setPushPermissionStatus(AuthorizationStatus.AUTHORIZED);
  });

  afterEach(() => {
    clearLeaderboardApiMock();
    jest.restoreAllMocks();
  });

  it('lists every followed trader and the saved trade threshold', async () => {
    renderSection();

    expect(
      await screen.findByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_ROW('trader-1'),
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_ROW('trader-2'),
      ),
    ).toBeOnTheScreen();

    expect(
      within(
        screen.getByTestId(
          NotificationPreferencesSelectorsIDs.TRADER_ROW('trader-1'),
        ),
      ).getByText('alpha.eth'),
    ).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(
          NotificationPreferencesSelectorsIDs.TRADER_ROW('trader-2'),
        ),
      ).getByText('beta.eth'),
    ).toBeOnTheScreen();

    await waitFor(() => {
      expect(isSwitchOn(traderToggle('trader-1'))).toBe(true);
      expect(isSwitchOn(traderToggle('trader-2'))).toBe(true);
      expect(isThresholdChecked(500)).toBe(true);
      expect(isThresholdDisabled(500)).toBe(false);
    });
    expect(
      screen.queryByTestId(NotificationPreferencesSelectorsIDs.TRADERS_EMPTY),
    ).not.toBeOnTheScreen();
  });

  it('does not show the Settings warning while push permission is promptable', async () => {
    setPushPermissionStatus(AuthorizationStatus.NOT_DETERMINED);

    renderSection();

    expect(
      await screen.findByTestId(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        NotificationSettingsViewSelectorsIDs.SOCIAL_PUSH_PERMISSION_WARNING,
      ),
    ).not.toBeOnTheScreen();
    expect(
      isSwitchOn(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBe(true);
  });

  it('keeps in-app notifications enabled and opens system settings from the denied-permission warning', async () => {
    setPushPermissionStatus(AuthorizationStatus.DENIED);
    const expectSystemSettingsOpened = mockOpenSystemSettings();

    renderSection();

    expect(
      await screen.findByTestId(
        NotificationSettingsViewSelectorsIDs.SOCIAL_PUSH_PERMISSION_WARNING,
      ),
    ).toBeOnTheScreen();
    expect(
      isSwitchOn(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBe(true);

    fireEvent.press(
      screen.getByTestId(
        NotificationSettingsViewSelectorsIDs.SOCIAL_PUSH_PERMISSION_SETTINGS_BUTTON,
      ),
    );

    expectSystemSettingsOpened();
    expect(
      screen.getByTestId(
        NotificationSettingsViewSelectorsIDs.SOCIAL_PUSH_PERMISSION_WARNING,
      ),
    ).toBeOnTheScreen();
    expect(
      isSwitchOn(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBe(true);
  });

  it('hides the warning after push permission is granted and the app resumes', async () => {
    const resumeApp = mockAppResume();
    setPushPermissionStatus(AuthorizationStatus.DENIED);
    renderSection();
    expect(
      await screen.findByTestId(
        NotificationSettingsViewSelectorsIDs.SOCIAL_PUSH_PERMISSION_WARNING,
      ),
    ).toBeOnTheScreen();
    setPushPermissionStatus(AuthorizationStatus.AUTHORIZED);

    await resumeApp();

    await waitFor(() => {
      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.SOCIAL_PUSH_PERMISSION_WARNING,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  it('hides the warning when push is turned off for trading signals', async () => {
    setPushPermissionStatus(AuthorizationStatus.DENIED);
    renderSection();
    const warning =
      NotificationSettingsViewSelectorsIDs.SOCIAL_PUSH_PERMISSION_WARNING;
    const pushToggle =
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE;
    expect(await screen.findByTestId(warning)).toBeOnTheScreen();

    fireEvent(screen.getByTestId(pushToggle), 'onValueChange', false);

    await waitFor(() => {
      expect(screen.queryByTestId(warning)).not.toBeOnTheScreen();
    });
    expect(
      isSwitchOn(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBe(true);

    fireEvent(screen.getByTestId(pushToggle), 'onValueChange', true);

    expect(await screen.findByTestId(warning)).toBeOnTheScreen();
  });

  it('persists a lower trade threshold and selects that option', async () => {
    renderSection();

    await waitFor(() => {
      expect(isThresholdChecked(500)).toBe(true);
      expect(isThresholdDisabled(100)).toBe(false);
    });

    fireEvent.press(screen.getByTestId(threshold(100)));

    await waitFor(() => {
      expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
        PUT_NOTIFICATION_PREFERENCES,
        expect.objectContaining({
          socialAI: expect.objectContaining({ txAmountLimit: 100 }),
        }),
        'mobile',
      );
    });
    expect(isThresholdChecked(100)).toBe(true);
    expect(isThresholdChecked(500)).toBe(false);
  });

  it('mutes one followed trader and leaves the other enabled', async () => {
    renderSection();

    await waitFor(() => {
      expect(isSwitchOn(traderToggle('trader-1'))).toBe(true);
    });

    fireEvent(
      screen.getByTestId(traderToggle('trader-1')),
      'valueChange',
      false,
    );

    await waitFor(() => {
      expect(isSwitchOn(traderToggle('trader-1'))).toBe(false);
    });
    expect(isSwitchOn(traderToggle('trader-2'))).toBe(true);
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      PUT_NOTIFICATION_PREFERENCES,
      expect.objectContaining({
        socialAI: expect.objectContaining({
          mutedTraderProfileIds: ['trader-1'],
        }),
      }),
      'mobile',
    );
  });

  it('turns both channels off and ignores a threshold press', async () => {
    renderSection();

    await waitFor(() => {
      expect(
        isSwitchOn(
          NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
        ),
      ).toBe(true);
      expect(
        isSwitchOn(
          NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
        ),
      ).toBe(true);
    });

    fireEvent(
      screen.getByTestId(
        NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
      ),
      'valueChange',
      false,
    );
    fireEvent(
      screen.getByTestId(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
      'valueChange',
      false,
    );

    await waitFor(() => {
      expect(isThresholdDisabled(100)).toBe(true);
    });
    expect(
      isSwitchOn(
        NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
      ),
    ).toBe(false);
    expect(
      isSwitchOn(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBe(false);

    getLeaderboardMessengerSpy().mockClear();

    fireEvent.press(screen.getByTestId(threshold(100)));

    expect(isThresholdChecked(500)).toBe(true);
    expect(isThresholdChecked(100)).toBe(false);
    expect(
      getLeaderboardMessengerSpy().mock.calls.filter(
        (call) => call[0] === PUT_NOTIFICATION_PREFERENCES,
      ),
    ).toHaveLength(0);
  });

  it('loads followed traders after the list error is retried', async () => {
    setupLeaderboardApiMock({
      following: FOLLOWED,
      followingFailuresBeforeSuccess: 1,
    });
    renderSocialAINotificationSettingsSection({
      presetOptions: { followingProfileIds: FOLLOWED_IDS },
    });

    expect(
      await screen.findByText(
        strings(
          'social_leaderboard.notification_preferences.error_loading_followed',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_ROW('trader-1'),
      ),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText(strings('homepage.error.retry')));

    expect(
      await screen.findByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_ROW('trader-1'),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.getByText('beta.eth')).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings(
          'social_leaderboard.notification_preferences.error_loading_followed',
        ),
      ),
    ).not.toBeOnTheScreen();
  });
});

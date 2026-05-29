import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  fireSwitchHaptic,
  ImpactFeedbackStyle,
  ImpactMoment,
  playImpact,
} from '../../../../util/haptics';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  useFollowedTraders,
  useNotificationPreferences,
  type FollowedTrader,
  type SocialAIPreference,
  type UseFollowedTradersResult,
  type UseNotificationPreferencesResult,
} from '../../SocialLeaderboard/NotificationPreferences/hooks';
import { NotificationPreferencesSelectorsIDs } from '../../SocialLeaderboard/NotificationPreferences/NotificationPreferences.testIds';
import SocialAINotificationPreferencesContent from './SocialAINotificationPreferencesContent';

const mockNavigate = jest.fn();
let mockIsSocialLeaderboardEnabled = true;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockIsSocialLeaderboardEnabled,
  }),
);

jest.mock('../../../../util/haptics', () => ({
  ...jest.requireActual('../../../../util/haptics'),
  fireSwitchHaptic: jest.fn(),
  playImpact: jest.fn(),
}));

jest.mock('../../SocialLeaderboard/NotificationPreferences/hooks', () => ({
  ...jest.requireActual(
    '../../SocialLeaderboard/NotificationPreferences/hooks',
  ),
  useFollowedTraders: jest.fn(),
  useNotificationPreferences: jest.fn(),
}));

const mockUseFollowedTraders = jest.mocked(useFollowedTraders);
const mockUseNotificationPreferences = jest.mocked(useNotificationPreferences);
const mockFireSwitchHaptic = jest.mocked(fireSwitchHaptic);
const mockPlayImpact = jest.mocked(playImpact);

const mockSetPushNotificationsEnabled = jest.fn().mockResolvedValue(undefined);
const mockSetTxAmountLimit = jest.fn().mockResolvedValue(undefined);
const mockToggleTraderNotification = jest.fn().mockResolvedValue(undefined);
const mockIsTraderNotificationEnabled = jest.fn().mockReturnValue(true);
const mockRefreshFollowed = jest.fn().mockResolvedValue(undefined);

const makePreferences = (
  overrides: Partial<SocialAIPreference> = {},
): SocialAIPreference => ({
  pushNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  txAmountLimit: 500,
  mutedTraderProfileIds: [],
  ...overrides,
});

const makeFollowedTradersResult = (
  overrides: Partial<UseFollowedTradersResult> = {},
): UseFollowedTradersResult => ({
  traders: [],
  isLoading: false,
  error: null,
  refresh: mockRefreshFollowed,
  ...overrides,
});

const makeNotificationPreferencesResult = (
  overrides: Partial<UseNotificationPreferencesResult> = {},
): UseNotificationPreferencesResult => ({
  preferences: makePreferences(),
  hasNotificationPreferences: true,
  isLoading: false,
  error: null,
  setPushNotificationsEnabled: mockSetPushNotificationsEnabled,
  setTxAmountLimit: mockSetTxAmountLimit,
  toggleTraderNotification: mockToggleTraderNotification,
  isTraderNotificationEnabled: mockIsTraderNotificationEnabled,
  ...overrides,
});

const followedTraders: FollowedTrader[] = [
  {
    id: 'trader-1',
    username: 'dutchiono',
    avatarUri: 'https://example.com/avatar.png',
  },
  {
    id: 'trader-2',
    username: 'pixelmage',
  },
];

const renderComponent = (
  props: React.ComponentProps<
    typeof SocialAINotificationPreferencesContent
  > = {},
) => renderWithProvider(<SocialAINotificationPreferencesContent {...props} />);

describe('SocialAINotificationPreferencesContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialLeaderboardEnabled = true;
    mockIsTraderNotificationEnabled.mockReturnValue(true);
    mockUseFollowedTraders.mockReturnValue(makeFollowedTradersResult());
    mockUseNotificationPreferences.mockReturnValue(
      makeNotificationPreferencesResult(),
    );
  });

  it('passes the social leaderboard feature flag to the followed traders hook', () => {
    mockIsSocialLeaderboardEnabled = false;

    renderComponent();

    expect(mockUseFollowedTraders).toHaveBeenCalledWith({ enabled: false });
  });

  it('renders the preferences skeleton while preferences load', () => {
    mockUseNotificationPreferences.mockReturnValue(
      makeNotificationPreferencesResult({ isLoading: true }),
    );

    renderComponent();

    expect(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.PREFERENCES_LOADING,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(NotificationPreferencesSelectorsIDs.GLOBAL_TOGGLE),
    ).toBeNull();
  });

  it('renders the empty followed traders state when the user follows no traders', () => {
    renderComponent();

    expect(
      screen.getByTestId(NotificationPreferencesSelectorsIDs.TRADERS_EMPTY),
    ).toBeOnTheScreen();
  });

  it('calls refreshFollowed when retry is pressed from the followed traders error state', () => {
    mockUseFollowedTraders.mockReturnValue(
      makeFollowedTradersResult({
        error: 'Failed to load traders',
      }),
    );

    renderComponent();

    fireEvent.press(screen.getByText(strings('homepage.error.retry')));

    expect(
      screen.getByTestId(NotificationPreferencesSelectorsIDs.TRADERS_ERROR),
    ).toBeOnTheScreen();
    expect(mockRefreshFollowed).toHaveBeenCalledTimes(1);
  });

  it('renders followed trader rows with their notification toggle values', () => {
    mockUseFollowedTraders.mockReturnValue(
      makeFollowedTradersResult({ traders: followedTraders }),
    );
    mockIsTraderNotificationEnabled.mockImplementation(
      (traderId: string) => traderId === 'trader-1',
    );

    renderComponent();

    expect(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_ROW('trader-1'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_TOGGLE('trader-1'),
      ).props.value,
    ).toBe(true);
    expect(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_TOGGLE('trader-2'),
      ).props.value,
    ).toBe(false);
  });

  it('sets push notifications enabled and fires a medium switch haptic when the global toggle changes', () => {
    renderComponent();

    fireEvent(
      screen.getByTestId(NotificationPreferencesSelectorsIDs.GLOBAL_TOGGLE),
      'valueChange',
      false,
    );

    expect(mockFireSwitchHaptic).toHaveBeenCalledWith(
      ImpactFeedbackStyle.Medium,
      { override: true },
    );
    expect(mockSetPushNotificationsEnabled).toHaveBeenCalledWith(false);
  });

  it('sets the transaction amount limit and fires a quick amount haptic when a new threshold is pressed', () => {
    renderComponent();

    fireEvent.press(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.THRESHOLD_OPTION(100),
      ),
    );

    expect(mockPlayImpact).toHaveBeenCalledWith(
      ImpactMoment.QuickAmountSelection,
    );
    expect(mockSetTxAmountLimit).toHaveBeenCalledWith(100);
  });

  it('does not set the transaction amount limit when the selected threshold is pressed again', () => {
    renderComponent();

    fireEvent.press(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.THRESHOLD_OPTION(500),
      ),
    );

    expect(mockPlayImpact).not.toHaveBeenCalled();
    expect(mockSetTxAmountLimit).not.toHaveBeenCalled();
  });

  it('toggles a trader notification and fires a light switch haptic when push notifications are on', () => {
    mockUseFollowedTraders.mockReturnValue(
      makeFollowedTradersResult({ traders: followedTraders }),
    );

    renderComponent();

    fireEvent(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_TOGGLE('trader-1'),
      ),
      'valueChange',
      false,
    );

    expect(mockFireSwitchHaptic).toHaveBeenCalledWith(
      ImpactFeedbackStyle.Light,
    );
    expect(mockToggleTraderNotification).toHaveBeenCalledWith('trader-1');
  });

  it('disables threshold and trader toggles while push notifications are off', () => {
    mockUseFollowedTraders.mockReturnValue(
      makeFollowedTradersResult({ traders: followedTraders }),
    );
    mockUseNotificationPreferences.mockReturnValue(
      makeNotificationPreferencesResult({
        preferences: makePreferences({ pushNotificationsEnabled: false }),
      }),
    );

    renderComponent();

    fireEvent(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_TOGGLE('trader-1'),
      ),
      'valueChange',
      false,
    );

    expect(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.THRESHOLD_OPTION(100),
      ).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_TOGGLE('trader-1'),
      ).props.disabled,
    ).toBe(true);
    expect(mockFireSwitchHaptic).not.toHaveBeenCalled();
    expect(mockToggleTraderNotification).not.toHaveBeenCalled();
  });

  it('navigates to the trader profile when a trader row is pressed', () => {
    mockUseFollowedTraders.mockReturnValue(
      makeFollowedTradersResult({ traders: followedTraders }),
    );

    renderComponent();

    fireEvent.press(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.TRADER_PRESS('trader-1'),
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.PROFILE,
      {
        traderId: 'trader-1',
        traderName: 'dutchiono',
      },
    );
  });

  it('omits the global push toggle when showPushToggle is false', () => {
    renderComponent({ showPushToggle: false });

    expect(
      screen.queryByTestId(NotificationPreferencesSelectorsIDs.GLOBAL_TOGGLE),
    ).toBeNull();
    expect(
      screen.getByTestId(
        NotificationPreferencesSelectorsIDs.THRESHOLD_OPTION(500),
      ),
    ).toBeOnTheScreen();
  });
});

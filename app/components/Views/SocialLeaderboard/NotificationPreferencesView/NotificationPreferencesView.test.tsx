import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { useFollowedTraders, useNotificationPreferences } from './hooks';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import NotificationPreferencesView from './NotificationPreferencesView';
import { NotificationPreferencesViewSelectorsIDs } from './NotificationPreferencesView.testIds';
import type {
  FollowedTrader,
  UseFollowedTradersResult,
} from './hooks/useFollowedTraders';
import type {
  UseNotificationPreferencesResult,
  NotificationPreferences,
} from './hooks/useNotificationPreferences';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../../util/theme', () => ({
  mockTheme: jest.requireActual('../../../../util/theme').mockTheme,
  useTheme: () => mockTheme,
  useAssetFromTheme: jest.fn((light: unknown) => light),
}));

jest.mock('./hooks', () => ({
  ...jest.requireActual('./hooks'),
  useFollowedTraders: jest.fn(),
  useNotificationPreferences: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(),
  }),
);

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Shared mock primitives
// ---------------------------------------------------------------------------

const mockUseFollowedTraders = useFollowedTraders as jest.MockedFunction<
  typeof useFollowedTraders
>;
const mockUseNotificationPreferences =
  useNotificationPreferences as jest.MockedFunction<
    typeof useNotificationPreferences
  >;
const mockSelectCurrentCurrency = selectCurrentCurrency as jest.MockedFunction<
  typeof selectCurrentCurrency
>;

const makeTrader = (
  id: string,
  username: string,
  avatarUri?: string,
): FollowedTrader => ({
  id,
  username,
  avatarUri,
});

const MOCK_TRADERS: FollowedTrader[] = [
  makeTrader('trader-1', 'dutchiono', 'https://example.com/a1.png'),
  makeTrader('trader-2', 'Kien', 'https://example.com/a2.png'),
  makeTrader('trader-3', 'Raggedandrusty'),
];

const makeUseFollowedTradersResult = (
  overrides: Partial<UseFollowedTradersResult> = {},
): UseFollowedTradersResult => ({
  traders: MOCK_TRADERS,
  isLoading: false,
  error: null,
  refresh: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makePreferences = (
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences => ({
  enabled: true,
  txAmountLimit: 500,
  mutedTraderProfileIds: [],
  ...overrides,
});

const makeUseNotificationPreferencesResult = (
  overrides: Partial<UseNotificationPreferencesResult> = {},
): UseNotificationPreferencesResult => {
  const preferences = overrides.preferences ?? makePreferences();
  const muted = new Set(preferences.mutedTraderProfileIds);
  return {
    preferences,
    isLoading: false,
    error: null,
    setEnabled: jest.fn().mockResolvedValue(undefined),
    setTxAmountLimit: jest.fn().mockResolvedValue(undefined),
    toggleTraderNotification: jest.fn().mockResolvedValue(undefined),
    isTraderNotificationEnabled: (id: string) => !muted.has(id),
    ...overrides,
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderScreen = () =>
  renderWithProvider(<NotificationPreferencesView />, { state: {} });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationPreferencesView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFollowedTraders.mockReturnValue(makeUseFollowedTradersResult());
    mockUseNotificationPreferences.mockReturnValue(
      makeUseNotificationPreferencesResult(),
    );
    mockSelectCurrentCurrency.mockReturnValue('usd');
  });

  describe('rendering', () => {
    it('renders the screen container', () => {
      renderScreen();

      expect(
        screen.getByTestId(NotificationPreferencesViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the header back button', () => {
      renderScreen();

      expect(
        screen.getByTestId(NotificationPreferencesViewSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the title', () => {
      renderScreen();

      expect(
        screen.getByText(
          strings('social_leaderboard.notification_preferences.title'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the global toggle reflecting the hook enabled value', () => {
      renderScreen();

      const toggle = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE,
      );
      expect(toggle).toBeOnTheScreen();
      expect(toggle.props.value).toBe(true);
    });

    it('renders all four dollar threshold options', () => {
      renderScreen();

      [10, 100, 500, 1000].forEach((amount) => {
        expect(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(amount),
          ),
        ).toBeOnTheScreen();
      });
    });

    it('marks the threshold option matching preferences.txAmountLimit as selected', () => {
      renderScreen();

      const option500 = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(500),
      );
      expect(option500.props.accessibilityState.checked).toBe(true);
    });

    it('marks non-matching thresholds as not selected', () => {
      renderScreen();

      [10, 100, 1000].forEach((amount) => {
        const option = screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(amount),
        );
        expect(option.props.accessibilityState.checked).toBe(false);
      });
    });

    it('renders the traders section', () => {
      renderScreen();

      expect(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADERS_SECTION,
        ),
      ).toBeOnTheScreen();
    });

    it('renders a row for each followed trader', () => {
      renderScreen();

      MOCK_TRADERS.forEach((trader) => {
        expect(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.TRADER_ROW(trader.id),
          ),
        ).toBeOnTheScreen();
      });
    });

    it('renders each trader toggle as enabled by default (no muted ids)', () => {
      renderScreen();

      MOCK_TRADERS.forEach((trader) => {
        const toggle = screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE(trader.id),
        );
        expect(toggle.props.value).toBe(true);
      });
    });

    it('renders a muted trader toggle as off', () => {
      mockUseNotificationPreferences.mockReturnValue(
        makeUseNotificationPreferencesResult({
          preferences: makePreferences({
            mutedTraderProfileIds: ['trader-1'],
          }),
        }),
      );

      renderScreen();

      const mutedToggle = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
      );
      expect(mutedToggle.props.value).toBe(false);
    });

    it('renders the traders section header text', () => {
      renderScreen();

      expect(
        screen.getByText(
          strings(
            'social_leaderboard.notification_preferences.traders_you_follow',
          ),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the traders section subtitle', () => {
      renderScreen();

      expect(
        screen.getByText(
          strings(
            'social_leaderboard.notification_preferences.traders_you_follow_desc',
          ),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('followed-traders async states', () => {
    it('renders the loading indicator while followed traders are loading', () => {
      mockUseFollowedTraders.mockReturnValue(
        makeUseFollowedTradersResult({ traders: [], isLoading: true }),
      );

      renderScreen();

      expect(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADERS_LOADING,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the empty state when the user follows nobody', () => {
      mockUseFollowedTraders.mockReturnValue(
        makeUseFollowedTradersResult({ traders: [], isLoading: false }),
      );

      renderScreen();

      expect(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADERS_EMPTY,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          strings(
            'social_leaderboard.notification_preferences.traders_you_follow_empty',
          ),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the error banner when the fetch fails', () => {
      mockUseFollowedTraders.mockReturnValue(
        makeUseFollowedTradersResult({
          traders: [],
          isLoading: false,
          error: 'boom',
          refresh: jest.fn().mockResolvedValue(undefined),
        }),
      );

      renderScreen();

      expect(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADERS_ERROR,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('disabled state when global toggle is off', () => {
    beforeEach(() => {
      mockUseNotificationPreferences.mockReturnValue(
        makeUseNotificationPreferencesResult({
          preferences: makePreferences({ enabled: false }),
        }),
      );
    });

    it('disables all threshold options when preferences.enabled is false', () => {
      renderScreen();

      [10, 100, 500, 1000].forEach((amount) => {
        const option = screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(amount),
        );
        expect(option.props.accessibilityState.disabled).toBe(true);
      });
    });

    it('disables all trader toggles when preferences.enabled is false', () => {
      renderScreen();

      MOCK_TRADERS.forEach((trader) => {
        const toggle = screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE(trader.id),
        );
        expect(toggle.props.disabled).toBe(true);
      });
    });
  });

  describe('interactions', () => {
    it('calls navigation.goBack when back button is pressed', () => {
      renderScreen();

      fireEvent.press(
        screen.getByTestId(NotificationPreferencesViewSelectorsIDs.BACK_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls setTxAmountLimit when a threshold option is pressed', () => {
      const setTxAmountLimit = jest.fn().mockResolvedValue(undefined);
      mockUseNotificationPreferences.mockReturnValue(
        makeUseNotificationPreferencesResult({ setTxAmountLimit }),
      );

      renderScreen();

      fireEvent.press(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(100),
        ),
      );

      expect(setTxAmountLimit).toHaveBeenCalledWith(100);
    });

    it('calls toggleTraderNotification when a trader switch is pressed', () => {
      const toggleTraderNotification = jest.fn().mockResolvedValue(undefined);
      mockUseNotificationPreferences.mockReturnValue(
        makeUseNotificationPreferencesResult({ toggleTraderNotification }),
      );

      renderScreen();

      fireEvent(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
        ),
        'valueChange',
        false,
      );

      expect(toggleTraderNotification).toHaveBeenCalledWith('trader-1');
    });

    it('calls setEnabled when the global toggle is pressed', () => {
      const setEnabled = jest.fn().mockResolvedValue(undefined);
      mockUseNotificationPreferences.mockReturnValue(
        makeUseNotificationPreferencesResult({ setEnabled }),
      );

      renderScreen();

      fireEvent(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE,
        ),
        'valueChange',
        false,
      );

      expect(setEnabled).toHaveBeenCalledWith(false);
    });
  });
});

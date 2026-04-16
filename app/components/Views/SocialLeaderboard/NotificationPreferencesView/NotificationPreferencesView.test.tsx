import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import NotificationPreferencesView from './NotificationPreferencesView';
import { NotificationPreferencesViewSelectorsIDs } from './NotificationPreferencesView.testIds';
import type { UseTopTradersResult } from '../../Homepage/Sections/TopTraders/hooks/useTopTraders';

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
}));

jest.mock('../../Homepage/Sections/TopTraders/hooks');

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

const mockUseTopTraders = useTopTraders as jest.MockedFunction<
  typeof useTopTraders
>;
const mockSelectCurrentCurrency = selectCurrentCurrency as jest.MockedFunction<
  typeof selectCurrentCurrency
>;

const makeTrader = (
  id: string,
  username: string,
  avatarUri?: string,
): UseTopTradersResult['traders'][number] => ({
  id,
  rank: 1,
  username,
  avatarUri,
  percentageChange: 10,
  pnlValue: 500,
  isFollowing: true,
});

const MOCK_TRADERS = [
  makeTrader('trader-1', 'dutchiono', 'https://example.com/a1.png'),
  makeTrader('trader-2', 'Kien', 'https://example.com/a2.png'),
  makeTrader('trader-3', 'Raggedandrusty'),
];

const makeUseTopTradersResult = (
  overrides: Partial<UseTopTradersResult> = {},
): UseTopTradersResult => ({
  traders: MOCK_TRADERS,
  isLoading: false,
  error: null,
  refresh: jest.fn().mockResolvedValue(undefined),
  toggleFollow: jest.fn(),
  ...overrides,
});

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
    mockUseTopTraders.mockReturnValue(makeUseTopTradersResult());
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

    it('renders the global toggle', () => {
      renderScreen();

      expect(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the global toggle as enabled by default', () => {
      renderScreen();

      const toggle = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE,
      );
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

    it('marks the $500 threshold as selected by default', () => {
      renderScreen();

      const option500 = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(500),
      );
      expect(option500.props.accessibilityState.checked).toBe(true);
    });

    it('marks non-default thresholds as not selected by default', () => {
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

    it('renders each trader toggle as enabled by default', () => {
      renderScreen();

      MOCK_TRADERS.forEach((trader) => {
        const toggle = screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE(trader.id),
        );
        expect(toggle.props.value).toBe(true);
      });
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

    it('renders no trader rows when there are no followed traders', () => {
      mockUseTopTraders.mockReturnValue(
        makeUseTopTradersResult({
          traders: MOCK_TRADERS.map((t) => ({ ...t, isFollowing: false })),
        }),
      );

      renderScreen();

      MOCK_TRADERS.forEach((trader) => {
        expect(
          screen.queryByTestId(
            NotificationPreferencesViewSelectorsIDs.TRADER_ROW(trader.id),
          ),
        ).not.toBeOnTheScreen();
      });
    });
  });

  describe('disabled state when global toggle is off', () => {
    const renderWithGlobalOff = () => {
      renderScreen();
      act(() => {
        fireEvent(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE,
          ),
          'valueChange',
          false,
        );
      });
    };

    it('disables all threshold options when global toggle is off', () => {
      renderWithGlobalOff();

      [10, 100, 500, 1000].forEach((amount) => {
        const option = screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(amount),
        );
        expect(option.props.accessibilityState.disabled).toBe(true);
      });
    });

    it('disables all trader toggles when global toggle is off', () => {
      renderWithGlobalOff();

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

    it('updates the selected threshold when a different option is pressed', () => {
      renderScreen();

      fireEvent.press(
        screen.getByTestId(
          NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(100),
        ),
      );

      const option100 = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(100),
      );
      expect(option100.props.accessibilityState.checked).toBe(true);

      const option500 = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(500),
      );
      expect(option500.props.accessibilityState.checked).toBe(false);
    });

    it('toggles a trader notification off when its switch is pressed', () => {
      renderScreen();

      act(() => {
        fireEvent(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
          ),
          'valueChange',
          false,
        );
      });

      const toggle = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
      );
      expect(toggle.props.value).toBe(false);
    });

    it('does not affect other trader toggles when one is switched off', () => {
      renderScreen();

      act(() => {
        fireEvent(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
          ),
          'valueChange',
          false,
        );
      });

      const toggle2 = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-2'),
      );
      expect(toggle2.props.value).toBe(true);
    });

    it('restores a trader notification when its switch is toggled back on', () => {
      renderScreen();

      act(() => {
        fireEvent(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
          ),
          'valueChange',
          false,
        );
      });
      act(() => {
        fireEvent(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
          ),
          'valueChange',
          true,
        );
      });

      const toggle = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE('trader-1'),
      );
      expect(toggle.props.value).toBe(true);
    });

    it('turns the global toggle off when it is pressed while enabled', () => {
      renderScreen();

      act(() => {
        fireEvent(
          screen.getByTestId(
            NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE,
          ),
          'valueChange',
          false,
        );
      });

      const toggle = screen.getByTestId(
        NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE,
      );
      expect(toggle.props.value).toBe(false);
    });
  });
});

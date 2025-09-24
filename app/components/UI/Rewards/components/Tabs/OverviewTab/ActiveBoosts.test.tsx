import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ActiveBoosts from './ActiveBoosts';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { PointsBoostDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { SkeletonProps } from '../../../../../../component-library/components/Skeleton';

// Mock dependencies
const mockUseTheme = jest.fn(() => ({
  themeAppearance: 'light',
}));

jest.mock('../../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockFn = jest.fn((styles: unknown) => {
      if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
      }
      if (typeof styles === 'string') {
        return { testID: `tw-${styles}` };
      }
      return styles || {};
    });

    const tw = Object.assign(mockFn, {
      style: mockFn,
      color: jest.fn((color) => color),
    });

    return tw;
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.active_boosts.title': 'Active boosts',
      'rewards.season_1': 'Season 1',
      'rewards.active_boosts.error': 'Failed to load active boosts',
    };
    return translations[key] || key;
  }),
}));

jest.mock('@metamask/bridge-controller', () => ({
  getNativeAssetForChainId: jest.fn(() => ({
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
  })),
}));

const mockGoToSwaps = jest.fn();

jest.mock('../../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: jest.fn(() => ({
    goToSwaps: mockGoToSwaps,
  })),
  SwapBridgeNavigationLocation: {
    Rewards: 'rewards',
  },
}));

jest.mock('../../../utils/formatUtils', () => ({
  formatTimeRemaining: jest.fn((date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 0 ? `${hours}h` : '1h';
  }),
}));

jest.mock('../../../../../../component-library/components/Skeleton', () => ({
  Skeleton: ({ testID, ...props }: SkeletonProps) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={testID || 'skeleton'} {...props} />;
  },
}));

// Mock RewardsThemeImageComponent
jest.mock('../../ThemeImageComponent', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (
        props: {
          themeImage?: { lightModeUrl?: string; darkModeUrl?: string };
          style?: unknown;
          testID?: string;
        },
        ref: unknown,
      ) =>
        ReactActual.createElement(View, {
          testID: props.testID || 'rewards-theme-image',
          'data-light-mode-url': props.themeImage?.lightModeUrl,
          'data-dark-mode-url': props.themeImage?.darkModeUrl,
          style: props.style,
          ref,
        }),
    ),
  };
});

const mockFormatTimeRemaining = jest.requireMock(
  '../../../utils/formatUtils',
).formatTimeRemaining;

// Mock React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
  };
});

// Create mock store
interface MockState {
  rewards: {
    activeBoosts: PointsBoostDto[] | null;
    activeBoostsLoading: boolean;
    activeBoostsError: boolean;
  };
}

const createMockStore = (initialState: MockState) =>
  configureStore({
    reducer: {
      rewards: (state = initialState.rewards) => state,
    },
    preloadedState: initialState,
  });

// Mock boost data
const mockBoost: PointsBoostDto = {
  id: 'boost-1',
  name: 'Swap Boost',
  icon: {
    lightModeUrl: 'https://example.com/light-icon.png',
    darkModeUrl: 'https://example.com/dark-icon.png',
  },
  boostBips: 500,
  seasonLong: false,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  backgroundColor: '#FF6B35',
};

const mockSeasonLongBoost: PointsBoostDto = {
  id: 'boost-2',
  name: 'Season Long Boost',
  icon: {
    lightModeUrl: 'https://example.com/season-light-icon.png',
    darkModeUrl: 'https://example.com/season-dark-icon.png',
  },
  boostBips: 1000,
  seasonLong: true,
  backgroundColor: '#4A90E2',
};

const mockBoostWithoutEndDate: PointsBoostDto = {
  id: 'boost-3',
  name: 'No End Date Boost',
  icon: {
    lightModeUrl: 'https://example.com/no-end-light-icon.png',
    darkModeUrl: 'https://example.com/no-end-dark-icon.png',
  },
  boostBips: 250,
  seasonLong: false,
  backgroundColor: '#50C878',
};

describe('ActiveBoosts', () => {
  const defaultState: MockState = {
    rewards: {
      activeBoosts: [],
      activeBoostsLoading: false,
      activeBoostsError: false,
    },
  };

  const renderWithProvider = (state: MockState = defaultState) => {
    const store = createMockStore(state);
    return render(
      <Provider store={store}>
        <ActiveBoosts />
      </Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading and Empty States', () => {
    it('should render section header and skeleton when loading', () => {
      const loadingState = {
        rewards: {
          activeBoosts: [],
          activeBoostsLoading: true,
          activeBoostsError: false,
        },
      };

      const { getByText, getByTestId } = renderWithProvider(loadingState);

      // Should show section header
      expect(getByText('Active boosts')).toBeTruthy();

      // Should show loading skeleton
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('should not render section header and skeleton when activeBoosts is empty', () => {
      const emptyBoostsState = {
        rewards: {
          activeBoosts: [],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { queryByText, queryByTestId } =
        renderWithProvider(emptyBoostsState);

      // Should not show section header
      expect(queryByText('Active boosts')).toBeNull();

      // Should not show loading skeleton
      expect(queryByTestId('skeleton')).toBeNull();
    });
  });

  describe('Error States', () => {
    it('should render section header and error banner when there is an error', () => {
      const errorState = {
        rewards: {
          activeBoosts: [],
          activeBoostsLoading: false,
          activeBoostsError: true,
        },
      };

      const { getByText } = renderWithProvider(errorState);

      // Should show section header
      expect(getByText('Active boosts')).toBeTruthy();

      // Should show error message
      expect(getByText('Failed to load active boosts')).toBeTruthy();
    });

    it('should render error banner and skeleton when both loading and error', () => {
      const loadingErrorState = {
        rewards: {
          activeBoosts: [],
          activeBoostsLoading: true,
          activeBoostsError: true,
        },
      };

      const { getByText, getByTestId } = renderWithProvider(loadingErrorState);

      // Should show section header
      expect(getByText('Active boosts')).toBeTruthy();

      // Should show error message
      expect(getByText('Failed to load active boosts')).toBeTruthy();

      // Should show loading skeleton
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('should render error banner but no boosts when error and boosts are available', () => {
      const errorWithBoostsState = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: true,
        },
      };

      const { getByText, queryByTestId } =
        renderWithProvider(errorWithBoostsState);

      // Should show section header with count
      expect(getByText('Active boosts')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();

      // Should show error message
      expect(getByText('Failed to load active boosts')).toBeTruthy();

      // Should NOT show boost cards when there's an error
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD),
      ).toBeNull();
    });

    it('should not render anything when error and no boosts and not loading', () => {
      const errorEmptyState = {
        rewards: {
          activeBoosts: [],
          activeBoostsLoading: false,
          activeBoostsError: true,
        },
      };

      const { getByText } = renderWithProvider(errorEmptyState);

      // Should still show section header and error banner even with empty boosts
      expect(getByText('Active boosts')).toBeTruthy();
      expect(getByText('Failed to load active boosts')).toBeTruthy();
    });
  });

  describe('Rendering with Boosts', () => {
    it('should render active boosts section with title and count', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost, mockSeasonLongBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByText } = renderWithProvider(stateWithBoosts);

      expect(getByText('Active boosts')).toBeTruthy();
      expect(getByText('2')).toBeTruthy(); // Count badge
    });

    it('should render boost cards with correct test IDs', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD),
      ).toBeTruthy();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_NAME),
      ).toBeTruthy();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_TIME_REMAINING),
      ).toBeTruthy();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_ICON),
      ).toBeTruthy();
    });

    it('should display boost name correctly', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      const nameElement = getByTestId(
        REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_NAME,
      );
      expect(nameElement.props.children).toBe('Swap Boost');
    });

    it('should render multiple boost cards', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [
            mockBoost,
            mockSeasonLongBoost,
            mockBoostWithoutEndDate,
          ],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getAllByTestId } = renderWithProvider(stateWithBoosts);

      const boostCards = getAllByTestId(
        REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD,
      );
      expect(boostCards).toHaveLength(3);
    });
  });

  describe('Boost Card Interactions', () => {
    it('should call goToSwaps when boost card is tapped', () => {
      // Reset the mock
      mockGoToSwaps.mockClear();

      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      const boostCard = getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD);
      fireEvent.press(boostCard);

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
    });
  });

  describe('Time Display Logic', () => {
    it('should display season long badge for season long boosts', () => {
      const stateWithSeasonBoost = {
        rewards: {
          activeBoosts: [mockSeasonLongBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByText } = renderWithProvider(stateWithSeasonBoost);

      expect(getByText('Season 1')).toBeTruthy();
    });

    it('should display time remaining for time-limited boosts', () => {
      // Ensure the mock returns the expected value
      mockFormatTimeRemaining.mockReturnValue('1h');

      const stateWithTimedBoost = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByText } = renderWithProvider(stateWithTimedBoost);

      // The formatTimeRemaining mock returns '1h' for future dates
      expect(getByText('1h')).toBeTruthy();
    });

    it('should not display time info for boosts without end date and not season long', () => {
      const stateWithNoEndDate = {
        rewards: {
          activeBoosts: [mockBoostWithoutEndDate],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { queryByText } = renderWithProvider(stateWithNoEndDate);

      // Should not show season badge or time remaining
      expect(queryByText('Season 1')).toBeNull();
      expect(queryByText('1h')).toBeNull();
    });
  });

  describe('RewardsThemeImageComponent Integration', () => {
    it('should render RewardsThemeImageComponent for boost with icon', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      expect(getByTestId('rewards-theme-image')).toBeTruthy();
    });

    it('should pass correct themeImage prop to RewardsThemeImageComponent', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      const boostIcon = getByTestId('rewards-theme-image');
      expect(boostIcon.props['data-light-mode-url']).toBe(
        'https://example.com/light-icon.png',
      );
      expect(boostIcon.props['data-dark-mode-url']).toBe(
        'https://example.com/dark-icon.png',
      );
    });

    it('should pass correct style prop to RewardsThemeImageComponent', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      const boostIcon = getByTestId('rewards-theme-image');
      expect(boostIcon.props.style).toBeDefined();
    });

    it('should not render RewardsThemeImageComponent when boost has no icon', () => {
      const boostWithoutIcon: PointsBoostDto = {
        ...mockBoost,
        icon: undefined as unknown as {
          lightModeUrl: string;
          darkModeUrl: string;
        },
      };

      const stateWithBoosts = {
        rewards: {
          activeBoosts: [boostWithoutIcon],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { queryByTestId, getByTestId } =
        renderWithProvider(stateWithBoosts);

      // Card should still render
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD),
      ).toBeTruthy();

      // But RewardsThemeImageComponent should not be present
      expect(queryByTestId('rewards-theme-image')).toBeNull();

      // Icon container should also not be present
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_ICON),
      ).toBeNull();
    });

    it('should update RewardsThemeImageComponent when boost data changes', () => {
      const initialState = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId, rerender } = renderWithProvider(initialState);

      const initialBoostIcon = getByTestId('rewards-theme-image');
      expect(initialBoostIcon.props['data-light-mode-url']).toBe(
        'https://example.com/light-icon.png',
      );

      // When: boost changes to different image URLs
      const updatedBoost: PointsBoostDto = {
        ...mockBoost,
        icon: {
          lightModeUrl: 'https://example.com/updated-light-icon.png',
          darkModeUrl: 'https://example.com/updated-dark-icon.png',
        },
      };

      const updatedState = {
        rewards: {
          activeBoosts: [updatedBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      rerender(
        <Provider store={createMockStore(updatedState)}>
          <ActiveBoosts />
        </Provider>,
      );

      // Then: new image URLs are used
      const updatedBoostIcon = getByTestId('rewards-theme-image');
      expect(updatedBoostIcon.props['data-light-mode-url']).toBe(
        'https://example.com/updated-light-icon.png',
      );
      expect(updatedBoostIcon.props['data-dark-mode-url']).toBe(
        'https://example.com/updated-dark-icon.png',
      );
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct styles to boost cards', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      const boostCard = getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD);

      // Check if styles are applied (mocked style function returns the styles)
      const styles = boostCard.props.style;
      expect(styles).toBeDefined();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should render boost icon container with correct testID', () => {
      const stateWithBoosts = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId } = renderWithProvider(stateWithBoosts);

      const iconContainer = getByTestId(
        REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_ICON,
      );
      expect(iconContainer).toBeTruthy();

      // The RewardsThemeImageComponent should be inside the container
      const rewardsThemeImage = getByTestId('rewards-theme-image');
      expect(rewardsThemeImage).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle boost without icon gracefully', () => {
      const boostWithoutIcon: PointsBoostDto = {
        ...mockBoost,
        icon: undefined as unknown as {
          lightModeUrl: string;
          darkModeUrl: string;
        },
      };

      const stateWithBoosts = {
        rewards: {
          activeBoosts: [boostWithoutIcon],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId, queryByTestId } =
        renderWithProvider(stateWithBoosts);

      // Card should still render
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD),
      ).toBeTruthy();

      // But icon container and RewardsThemeImageComponent should not be present
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_ICON),
      ).toBeNull();
      expect(queryByTestId('rewards-theme-image')).toBeNull();
    });

    it('should handle expired boost correctly', () => {
      const expiredBoost: PointsBoostDto = {
        ...mockBoost,
        endDate: '2020-01-01', // Past date
      };

      // Mock formatTimeRemaining to return null for expired dates
      mockFormatTimeRemaining.mockReturnValue(null);

      const stateWithExpiredBoost = {
        rewards: {
          activeBoosts: [expiredBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByTestId, queryByText } = renderWithProvider(
        stateWithExpiredBoost,
      );

      // Card should still render
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD),
      ).toBeTruthy();

      // But no time remaining should be shown
      expect(queryByText('1h')).toBeNull();
    });

    it('should handle single boost correctly', () => {
      const stateWithSingleBoost = {
        rewards: {
          activeBoosts: [mockBoost],
          activeBoostsLoading: false,
          activeBoostsError: false,
        },
      };

      const { getByText, getAllByTestId } =
        renderWithProvider(stateWithSingleBoost);

      expect(getByText('1')).toBeTruthy(); // Count badge should show 1

      const boostCards = getAllByTestId(
        REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD,
      );
      expect(boostCards).toHaveLength(1);
    });
  });
});

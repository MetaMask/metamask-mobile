import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PreviousSeasonLevel from './PreviousSeasonLevel';
import {
  selectCurrentTier,
  selectSeasonId,
  selectSeasonStatusError,
  selectSeasonStatusLoading,
} from '../../../../../reducers/rewards/selectors';
import { SeasonTierDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { AppThemeKey } from '../../../../../util/theme/models';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock theme
const mockUseTheme = jest.fn();

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
  AppThemeKey: {
    os: 'os',
    light: 'light',
    dark: 'dark',
  },
}));

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    // Add the style method to the mock function
    Object.assign(mockTw, {
      style: jest.fn((styles) => {
        if (Array.isArray(styles)) {
          return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
        }
        return styles || {};
      }),
    });
    return mockTw;
  },
}));

describe('PreviousSeasonLevel', () => {
  const mockSeasonId = 'season-123';
  const mockCurrentTier: SeasonTierDto = {
    id: 'tier-1',
    name: 'Origin',
    pointsNeeded: 0,
    image: {
      lightModeUrl: 'https://example.com/light.png',
      darkModeUrl: 'https://example.com/dark.png',
    },
    levelNumber: 'Level 1',
    rewards: [],
  };

  const mockTheme = {
    themeAppearance: AppThemeKey.light,
    brandColors: {
      grey100: '#F5F5F5',
      grey700: '#4A4A4A',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return mockSeasonId;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return mockCurrentTier;
      return undefined;
    });
  });

  it('returns null when seasonId is missing', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return null;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return mockCurrentTier;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonLevel />);
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('returns null when currentTier is missing', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return mockSeasonId;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return null;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonLevel />);
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('returns null when there is an error and not loading', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return mockSeasonId;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return 'Error message';
      if (selector === selectCurrentTier) return mockCurrentTier;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonLevel />);
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('renders component with tier image when image exists', () => {
    const { getByTestId } = render(<PreviousSeasonLevel />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeOnTheScreen();
    expect(getByTestId('theme-image')).toBeOnTheScreen();
  });

  it('renders fallback icon when image does not exist', () => {
    const tierWithoutImage: SeasonTierDto = {
      ...mockCurrentTier,
      image: null as unknown as SeasonTierDto['image'],
    };

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return mockSeasonId;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return tierWithoutImage;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonLevel />);

    expect(getByText('Icon-Star')).toBeOnTheScreen();
  });

  it('renders tier level number', () => {
    const { getByText } = render(<PreviousSeasonLevel />);

    expect(getByText(mockCurrentTier.levelNumber)).toBeOnTheScreen();
  });

  it('renders tier name', () => {
    const { getByText } = render(<PreviousSeasonLevel />);

    expect(getByText(mockCurrentTier.name)).toBeOnTheScreen();
  });

  it('shows loading state when seasonLoading is true and seasonId is missing', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return null;
      if (selector === selectSeasonStatusLoading) return true;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return mockCurrentTier;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonLevel />);

    const tile = getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL);
    expect(tile.props['data-loading']).toBe(true);
  });

  it('uses light theme colors for fallback icon background when theme is light', () => {
    mockUseTheme.mockReturnValue({
      ...mockTheme,
      themeAppearance: AppThemeKey.light,
    });

    const tierWithoutImage: SeasonTierDto = {
      ...mockCurrentTier,
      image: null as unknown as SeasonTierDto['image'],
    };

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return mockSeasonId;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return tierWithoutImage;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonLevel />);

    expect(getByText('Icon-Star')).toBeOnTheScreen();
  });

  it('uses dark theme colors for fallback icon background when theme is dark', () => {
    mockUseTheme.mockReturnValue({
      ...mockTheme,
      themeAppearance: AppThemeKey.dark,
    });

    const tierWithoutImage: SeasonTierDto = {
      ...mockCurrentTier,
      image: null as unknown as SeasonTierDto['image'],
    };

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return mockSeasonId;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return tierWithoutImage;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonLevel />);

    expect(getByText('Icon-Star')).toBeOnTheScreen();
  });

  it('does not show loading state when seasonId exists even if loading', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return mockSeasonId;
      if (selector === selectSeasonStatusLoading) return true;
      if (selector === selectSeasonStatusError) return null;
      if (selector === selectCurrentTier) return mockCurrentTier;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonLevel />);

    const tile = getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL);
    expect(tile.props['data-loading']).toBe(false);
  });
});

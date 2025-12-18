import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PreviousSeasonLevel from './PreviousSeasonLevel';
import { SeasonTierDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { AppThemeKey } from '../../../../../util/theme/models';

// Mock theme
const mockUseTheme = jest.fn();

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
  useAssetFromTheme: jest.requireActual('../../../../../util/theme')
    .useAssetFromTheme,
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

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(View, props, children);

  const TextComponent = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(Text, props, children);

  const Icon = ({ name, ...props }: { name: string; [key: string]: unknown }) =>
    ReactActual.createElement(
      View,
      props,
      ReactActual.createElement(Text, null, `Icon-${name}`),
    );

  return {
    Box,
    Text: TextComponent,
    Icon,
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    TextVariant: {
      BodyLg: 'BodyLg',
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
    IconName: {
      Star: 'Star',
    },
    IconSize: {
      Md: 'Md',
    },
  };
});

// Mock PreviousSeasonSummaryTile
jest.mock('./PreviousSeasonSummaryTile', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  const PreviousSeasonSummaryTile = ({
    children,
    isLoading,
    testID,
  }: {
    children: React.ReactNode;
    isLoading?: boolean;
    testID?: string;
  }) =>
    ReactActual.createElement(
      View,
      { testID, 'data-loading': isLoading },
      isLoading
        ? ReactActual.createElement(
            Text,
            { testID: 'loading-skeleton' },
            'Loading',
          )
        : children,
    );

  return PreviousSeasonSummaryTile;
});

// Mock RewardsThemeImageComponent
jest.mock('../ThemeImageComponent', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const RewardsThemeImageComponent = (props: {
    themeImage?: unknown;
    style?: unknown;
    [key: string]: unknown;
  }) => ReactActual.createElement(View, { testID: 'theme-image', ...props });

  return RewardsThemeImageComponent;
});

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

  const defaultState = {
    user: {
      appTheme: AppThemeKey.light,
    },
    engine: {
      backgroundState: {
        RewardsController: {},
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
  });

  it('returns null when seasonId is missing', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: null,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: mockCurrentTier,
      },
    };

    const { queryByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('returns null when currentTier is missing', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: null,
      },
    };

    const { queryByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('returns null when there is an error and not loading', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: 'Error message',
        currentTier: mockCurrentTier,
      },
    };

    const { queryByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('renders component with tier image when image exists', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: mockCurrentTier,
      },
    };

    const { getByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

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

    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: tierWithoutImage,
      },
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(getByText('Icon-Star')).toBeOnTheScreen();
  });

  it('renders tier level number', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: mockCurrentTier,
      },
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(getByText(mockCurrentTier.levelNumber)).toBeOnTheScreen();
  });

  it('renders tier name', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: mockCurrentTier,
      },
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(getByText(mockCurrentTier.name)).toBeOnTheScreen();
  });

  it('returns null when seasonLoading is true and seasonId is missing', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: null,
        seasonStatusLoading: true,
        seasonStatusError: null,
        currentTier: mockCurrentTier,
      },
    };

    const { queryByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
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

    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: tierWithoutImage,
      },
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

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

    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: false,
        seasonStatusError: null,
        currentTier: tierWithoutImage,
      },
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(getByText('Icon-Star')).toBeOnTheScreen();
  });

  it('does not show loading state when seasonId exists even if loading', () => {
    const state = {
      ...defaultState,
      rewards: {
        seasonId: mockSeasonId,
        seasonStatusLoading: true,
        seasonStatusError: null,
        currentTier: mockCurrentTier,
      },
    };

    const { getByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    const tile = getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL);
    expect(tile.props['data-loading']).toBe(false);
  });
});

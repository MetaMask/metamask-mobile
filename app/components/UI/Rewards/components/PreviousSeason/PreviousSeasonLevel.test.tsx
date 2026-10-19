import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PreviousSeasonLevel from './PreviousSeasonLevel';
import { SeasonTierDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { AppThemeKey } from '../../../../../util/theme/models';
import { buildSeasonSubscriptionCompositeKey } from '../../../../../reducers/rewards/compositeKeys';

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

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
      HeadingSm: 'HeadingSm',
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
    IconName: {
      Rocket: 'Rocket',
    },
    IconSize: {
      Lg: 'Lg',
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

describe('PreviousSeasonLevel', () => {
  const mockSeasonId = 'season-123';
  const mockSubscriptionId = 'test-subscription-id';
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

  const defaultState = {
    user: {
      appTheme: AppThemeKey.light,
    },
    engine: {
      backgroundState: {
        RewardsController: {
          activeAccount: { subscriptionId: mockSubscriptionId },
        },
      },
    },
  };

  const createRewardsState = ({
    seasonId,
    loading = false,
    error = null,
    currentTier = mockCurrentTier,
  }: {
    seasonId: string | null;
    loading?: boolean;
    error?: string | null;
    currentTier?: SeasonTierDto | null;
  }) => ({
    candidateSubscriptionId: mockSubscriptionId,
    seasonId,
    seasonUserStatuses:
      seasonId == null
        ? {}
        : {
            [buildSeasonSubscriptionCompositeKey(seasonId, mockSubscriptionId)]:
              {
                balanceTotal: null,
                balanceUpdatedAt: null,
                currentTier,
                nextTier: null,
                nextTierPointsNeeded: null,
                loading,
                error,
              },
          },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when seasonId is missing', () => {
    const state = {
      ...defaultState,
      rewards: createRewardsState({
        seasonId: null,
        currentTier: mockCurrentTier,
      }),
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
      rewards: createRewardsState({
        seasonId: mockSeasonId,
        currentTier: null,
      }),
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
      rewards: createRewardsState({
        seasonId: mockSeasonId,
        error: 'Error message',
        currentTier: mockCurrentTier,
      }),
    };

    const { queryByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('renders component with rocket icon', () => {
    const state = {
      ...defaultState,
      rewards: createRewardsState({ seasonId: mockSeasonId }),
    };

    const { getByTestId, getByText } = renderWithProvider(
      <PreviousSeasonLevel />,
      {
        state,
      },
    );

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeOnTheScreen();
    expect(getByText('Icon-Rocket')).toBeOnTheScreen();
  });

  it('renders tier level number', () => {
    const state = {
      ...defaultState,
      rewards: createRewardsState({ seasonId: mockSeasonId }),
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(getByText(mockCurrentTier.levelNumber)).toBeOnTheScreen();
  });

  it('renders tier name', () => {
    const state = {
      ...defaultState,
      rewards: createRewardsState({ seasonId: mockSeasonId }),
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(getByText(mockCurrentTier.name)).toBeOnTheScreen();
  });

  it('returns null when seasonLoading is true and seasonId is missing', () => {
    const state = {
      ...defaultState,
      rewards: createRewardsState({
        seasonId: null,
        loading: true,
        currentTier: mockCurrentTier,
      }),
    };

    const { queryByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL),
    ).toBeNull();
  });

  it('does not show loading state when seasonId exists even if loading', () => {
    const state = {
      ...defaultState,
      rewards: createRewardsState({
        seasonId: mockSeasonId,
        loading: true,
      }),
    };

    const { getByTestId } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    const tile = getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_LEVEL);
    expect(tile.props['data-loading']).toBe(false);
  });

  it('renders both level number and name together', () => {
    const customTier: SeasonTierDto = {
      ...mockCurrentTier,
      levelNumber: 'Level 5',
      name: 'Diamond',
    };

    const state = {
      ...defaultState,
      rewards: createRewardsState({
        seasonId: mockSeasonId,
        currentTier: customTier,
      }),
    };

    const { getByText } = renderWithProvider(<PreviousSeasonLevel />, {
      state,
    });

    expect(getByText('Level 5')).toBeOnTheScreen();
    expect(getByText('Diamond')).toBeOnTheScreen();
  });
});

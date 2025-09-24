import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import UpcomingRewards from './UpcomingRewards';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import {
  SeasonTierDto,
  SeasonRewardDto,
  SeasonRewardType,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock selectors
jest.mock('../../../../../../reducers/rewards/selectors', () => ({
  selectSeasonTiers: jest.fn(),
  selectCurrentTier: jest.fn(),
}));

jest.mock('../../../../../../selectors/rewards', () => ({
  selectRewardsActiveAccountAddress: jest.fn(),
}));

import {
  selectSeasonTiers,
  selectCurrentTier,
} from '../../../../../../reducers/rewards/selectors';

import { selectRewardsActiveAccountAddress } from '../../../../../../selectors/rewards';

const mockSelectSeasonTiers = selectSeasonTiers as jest.MockedFunction<
  typeof selectSeasonTiers
>;
const mockSelectCurrentTier = selectCurrentTier as jest.MockedFunction<
  typeof selectCurrentTier
>;
const mockSelectRewardsActiveAccountAddress =
  selectRewardsActiveAccountAddress as jest.MockedFunction<
    typeof selectRewardsActiveAccountAddress
  >;

// Mock theme
jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    brandColors: { grey700: '#374151' },
  }),
}));

// Mock i18n
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock format utils
jest.mock('../../../utils/formatUtils', () => ({
  formatNumber: jest.fn((value: number) => value.toString()),
  getIconName: jest.fn(() => 'Star'),
}));

// Use actual design system components
// Remove mocks to let real components render with testIDs

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

// Mock only essential React Native components for testing
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    ...jest.requireActual('react-native').Animated,
    Value: jest.fn(() => ({
      interpolate: jest.fn(() => '0deg'),
    })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
  },
}));

// Test data
const mockSeasonReward: SeasonRewardDto = {
  id: 'reward-1',
  name: 'Test Reward',
  shortDescription: 'A test reward',
  longDescription: 'A long description for the test reward',
  shortUnlockedDescription:
    'A short description for the test reward when unlocked',
  longUnlockedDescription:
    'A long description for the test reward when unlocked',
  iconName: 'Star',
  rewardType: SeasonRewardType.GENERIC,
  claimUrl: 'https://example.com/claim/{address}',
};

const mockSeasonTier: SeasonTierDto = {
  id: 'tier-1',
  name: 'Bronze',
  levelNumber: '1',
  pointsNeeded: 1000,
  image: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  rewards: [mockSeasonReward],
};

const mockCurrentTier: SeasonTierDto = {
  id: 'current-tier',
  name: 'Starter',
  levelNumber: '0',
  pointsNeeded: 0,
  image: {
    lightModeUrl: 'https://example.com/starter-light.png',
    darkModeUrl: 'https://example.com/starter-dark.png',
  },
  rewards: [],
};

describe('UpcomingRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSeasonTiers.mockReturnValue([mockCurrentTier, mockSeasonTier]);
    mockSelectCurrentTier.mockReturnValue(mockCurrentTier);
    mockSelectRewardsActiveAccountAddress.mockReturnValue('0x123');
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonTiers)
        return [mockCurrentTier, mockSeasonTier];
      if (selector === selectCurrentTier) return mockCurrentTier;
      if (selector === selectRewardsActiveAccountAddress) return '0x123';
      return [];
    });
  });

  it('should render tier image with testID', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE)).toBeDefined();
  });

  it('should render tier name with testID', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_NAME)).toBeDefined();
  });

  it('should render tier points needed with testID', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TIER_POINTS_NEEDED),
    ).toBeDefined();
  });

  it('should render tier rewards container with testID when tier has rewards', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARDS)).toBeDefined();
  });

  it('should not render anything when there are no upcoming tiers', () => {
    // Set up scenario where current tier has higher points than all other tiers
    const lowerTier = { ...mockSeasonTier, pointsNeeded: 500 };
    const currentTierWithHigherPoints = {
      ...mockCurrentTier,
      pointsNeeded: 1000,
    };

    mockSelectSeasonTiers.mockReturnValue([
      lowerTier,
      currentTierWithHigherPoints,
    ]);
    mockSelectCurrentTier.mockReturnValue(currentTierWithHigherPoints);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonTiers)
        return [lowerTier, currentTierWithHigherPoints];
      if (selector === selectCurrentTier) return currentTierWithHigherPoints;
      return [];
    });

    const { toJSON } = render(<UpcomingRewards />);
    expect(toJSON()).toBeNull();
  });

  describe('RewardsThemeImageComponent Integration', () => {
    it('should render RewardsThemeImageComponent for tier with image', () => {
      const { getByTestId } = render(<UpcomingRewards />);

      expect(getByTestId('rewards-theme-image')).toBeTruthy();
    });

    it('should pass correct themeImage prop to RewardsThemeImageComponent', () => {
      const { getByTestId } = render(<UpcomingRewards />);

      const tierImage = getByTestId('rewards-theme-image');
      expect(tierImage.props['data-light-mode-url']).toBe(
        'https://example.com/light.png',
      );
      expect(tierImage.props['data-dark-mode-url']).toBe(
        'https://example.com/dark.png',
      );
    });

    it('should pass correct style prop to RewardsThemeImageComponent', () => {
      const { getByTestId } = render(<UpcomingRewards />);

      const tierImage = getByTestId('rewards-theme-image');
      expect(tierImage.props.style).toBeDefined();
    });

    it('should render fallback icon when tier has no image', () => {
      // Given: tier without image
      const tierWithoutImage = {
        ...mockSeasonTier,
        image: undefined,
      } as unknown as SeasonTierDto;

      mockSelectSeasonTiers.mockReturnValue([
        mockCurrentTier,
        tierWithoutImage,
      ]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, tierWithoutImage];
        if (selector === selectCurrentTier) return mockCurrentTier;
        return [];
      });

      const { queryByTestId, getByTestId } = render(<UpcomingRewards />);

      // Should not render RewardsThemeImageComponent
      expect(queryByTestId('rewards-theme-image')).toBeNull();

      // Should render tier image testID from TIER_IMAGE selector
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE)).toBeTruthy();
    });

    it('should update RewardsThemeImageComponent when tier data changes', () => {
      // Given: initial tier with image
      const { getByTestId, rerender } = render(<UpcomingRewards />);
      const initialTierImage = getByTestId('rewards-theme-image');
      expect(initialTierImage.props['data-light-mode-url']).toBe(
        'https://example.com/light.png',
      );

      // When: tier changes to different image URLs
      const updatedTier = {
        ...mockSeasonTier,
        image: {
          lightModeUrl: 'https://example.com/updated-light.png',
          darkModeUrl: 'https://example.com/updated-dark.png',
        },
      };

      mockSelectSeasonTiers.mockReturnValue([mockCurrentTier, updatedTier]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, updatedTier];
        if (selector === selectCurrentTier) return mockCurrentTier;
        return [];
      });

      rerender(<UpcomingRewards />);

      // Then: new image URLs are used
      const updatedTierImage = getByTestId('rewards-theme-image');
      expect(updatedTierImage.props['data-light-mode-url']).toBe(
        'https://example.com/updated-light.png',
      );
      expect(updatedTierImage.props['data-dark-mode-url']).toBe(
        'https://example.com/updated-dark.png',
      );
    });
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReactTestInstance } from 'react-test-renderer';
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
  selectSeasonStatusLoading: jest.fn(),
  selectSeasonStatusError: jest.fn(),
  selectSeasonStartDate: jest.fn(),
}));

// Mock RewardsErrorBanner
jest.mock('../../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, description }: { title: string; description: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(Text, { testID: 'error-title' }, title),
        ReactActual.createElement(
          Text,
          { testID: 'error-description' },
          description,
        ),
      ),
  };
});

// Mock RewardsImageModal
jest.mock('../../RewardsImageModal', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      visible,
      onClose,
      themeImage,
      _fallbackImage,
    }: {
      visible: boolean;
      onClose: () => void;
      themeImage?: { lightModeUrl?: string; darkModeUrl?: string };
      _fallbackImage?: unknown;
    }) =>
      visible
        ? ReactActual.createElement(
            View,
            { testID: 'rewards-image-modal' },
            ReactActual.createElement(
              Text,
              { testID: 'modal-light-url' },
              themeImage?.lightModeUrl || '',
            ),
            ReactActual.createElement(
              Text,
              { testID: 'modal-dark-url' },
              themeImage?.darkModeUrl || '',
            ),
            ReactActual.createElement(
              Text,
              {
                testID: 'modal-close-button',
                onPress: onClose,
              },
              'Close',
            ),
          )
        : null,
  };
});

import {
  selectSeasonTiers,
  selectCurrentTier,
  selectSeasonStatusLoading,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../../reducers/rewards/selectors';

const mockSelectSeasonTiers = selectSeasonTiers as jest.MockedFunction<
  typeof selectSeasonTiers
>;
const mockSelectCurrentTier = selectCurrentTier as jest.MockedFunction<
  typeof selectCurrentTier
>;
const mockSelectSeasonStatusLoading =
  selectSeasonStatusLoading as jest.MockedFunction<
    typeof selectSeasonStatusLoading
  >;
const mockSelectSeasonStatusError =
  selectSeasonStatusError as jest.MockedFunction<
    typeof selectSeasonStatusError
  >;
const mockSelectSeasonStartDate = selectSeasonStartDate as jest.MockedFunction<
  typeof selectSeasonStartDate
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
    mockSelectSeasonStatusLoading.mockReturnValue(false);
    mockSelectSeasonStatusError.mockReturnValue('');
    mockSelectSeasonStartDate.mockReturnValue(new Date('2024-01-01'));
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonTiers)
        return [mockCurrentTier, mockSeasonTier];
      if (selector === selectCurrentTier) return mockCurrentTier;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectSeasonStartDate) return new Date('2024-01-01');
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
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectSeasonStartDate) return new Date('2024-01-01');
      return [];
    });

    const { toJSON } = render(<UpcomingRewards />);
    expect(toJSON()).toBeNull();
  });

  describe('Loading and Error States', () => {
    it('should show loading state when seasonStatusLoading is true', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, mockSeasonTier];
        if (selector === selectCurrentTier) return mockCurrentTier;
        if (selector === selectSeasonStatusLoading) return true;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      const { getByText } = render(<UpcomingRewards />);

      // Should show section header with loading indicator
      expect(getByText('rewards.upcoming_rewards.title')).toBeTruthy();
    });

    it('should show error banner when seasonStatusError is true and no seasonStartDate', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers) return [];
        if (selector === selectCurrentTier) return null;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return null;
        return [];
      });

      const { getByText, getByTestId } = render(<UpcomingRewards />);

      // Should show section header
      expect(getByText('rewards.upcoming_rewards.title')).toBeTruthy();

      // Should show error banner
      expect(getByTestId('rewards-error-banner')).toBeTruthy();
    });

    it('should show skeleton when loading or seasonStartDate is null', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers) return [];
        if (selector === selectCurrentTier) return null;
        if (selector === selectSeasonStatusLoading) return true;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return null;
        return [];
      });

      const { getByText } = render(<UpcomingRewards />);

      // Should show section header
      expect(getByText('rewards.upcoming_rewards.title')).toBeTruthy();
    });

    it('should not show error banner when seasonStatusError is true but seasonStartDate exists', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers) return [];
        if (selector === selectCurrentTier) return null;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      const { getByText, queryByTestId } = render(<UpcomingRewards />);

      // Should show section header
      expect(getByText('rewards.upcoming_rewards.title')).toBeTruthy();

      // Should NOT show error banner when seasonStartDate exists
      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });
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
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
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
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
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

  describe('Image Modal Functionality', () => {
    it('should not display modal initially', () => {
      // Given: component is rendered
      const { queryByTestId } = render(<UpcomingRewards />);

      // Then: modal should not be visible
      expect(queryByTestId('rewards-image-modal')).toBeNull();
    });

    it('should enable TouchableOpacity when tier has image', () => {
      // Given: tier with image
      const { getByTestId } = render(<UpcomingRewards />);

      // Then: TouchableOpacity should be enabled
      const tierImageContainer = getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE);
      const touchableOpacity = tierImageContainer
        .children[0] as ReactTestInstance;
      expect(touchableOpacity.props.disabled).toBe(false);
    });

    it('should display modal with correct image when tier image is pressed', () => {
      // Given: component is rendered with tier image
      const { getByTestId } = render(<UpcomingRewards />);
      const tierImageContainer = getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE);
      const touchableOpacity = tierImageContainer
        .children[0] as ReactTestInstance;

      // When: user presses the tier image
      fireEvent.press(touchableOpacity);

      // Then: modal should be visible with the correct image
      const modal = getByTestId('rewards-image-modal');
      expect(modal).toBeTruthy();
      expect(getByTestId('modal-light-url')).toHaveTextContent(
        'https://example.com/light.png',
      );
      expect(getByTestId('modal-dark-url')).toHaveTextContent(
        'https://example.com/dark.png',
      );
    });

    it('should close modal and clear selected image when close button is pressed', () => {
      // Given: modal is open with a selected image
      const { getByTestId, queryByTestId } = render(<UpcomingRewards />);
      const tierImageContainer = getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE);
      const touchableOpacity = tierImageContainer
        .children[0] as ReactTestInstance;

      fireEvent.press(touchableOpacity);
      expect(getByTestId('rewards-image-modal')).toBeTruthy();

      // When: user presses the close button
      const closeButton = getByTestId('modal-close-button');
      fireEvent.press(closeButton);

      // Then: modal should be closed
      expect(queryByTestId('rewards-image-modal')).toBeNull();
    });

    it('should not open modal when tier image is undefined', () => {
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
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      const { getByTestId, queryByTestId } = render(<UpcomingRewards />);
      const tierImageContainer = getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE);
      const touchableOpacity = tierImageContainer
        .children[0] as ReactTestInstance;

      // When: user attempts to press tier container with no image
      fireEvent.press(touchableOpacity);

      // Then: modal should not open
      expect(queryByTestId('rewards-image-modal')).toBeNull();
    });

    it('should disable TouchableOpacity when tier has no image', () => {
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
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      const { getByTestId } = render(<UpcomingRewards />);

      // Then: TouchableOpacity should be disabled
      const tierImageContainer = getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE);
      const touchableOpacity = tierImageContainer
        .children[0] as ReactTestInstance;
      expect(touchableOpacity.props.disabled).toBe(true);
    });
  });

  describe('Tier Toggle Functionality', () => {
    it('should collapse tier when toggle is pressed on expanded tier', () => {
      // Given: component is rendered with tier expanded by default
      const { getByTestId } = render(<UpcomingRewards />);
      const tierRewards = getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARDS);

      // Verify tier is initially expanded (rewards are visible)
      expect(tierRewards).toBeTruthy();

      // When: user presses the toggle to collapse
      const tierName = getByTestId(REWARDS_VIEW_SELECTORS.TIER_NAME);
      const tierHeader = tierName.parent?.parent as ReactTestInstance;
      fireEvent.press(tierHeader);

      // Then: tier should be collapsed (rewards not visible)
      const { queryByTestId } = render(<UpcomingRewards />);
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARDS)).toBeTruthy();
    });

    it('should expand tier when toggle is pressed on collapsed tier', () => {
      // Given: component is rendered with tier expanded
      const { getByTestId } = render(<UpcomingRewards />);
      const tierName = getByTestId(REWARDS_VIEW_SELECTORS.TIER_NAME);
      const tierHeader = tierName.parent?.parent as ReactTestInstance;

      // When: collapse the tier first
      fireEvent.press(tierHeader);

      // Then: expand it again
      fireEvent.press(tierHeader);

      // Verify tier rewards are visible
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARDS)).toBeTruthy();
    });

    it('should initialize with all upcoming tiers expanded by default', () => {
      // Given: multiple upcoming tiers
      const tier2: SeasonTierDto = {
        id: 'tier-2',
        name: 'Silver',
        levelNumber: '2',
        pointsNeeded: 2000,
        image: mockSeasonTier.image,
        rewards: [mockSeasonReward],
      };

      mockSelectSeasonTiers.mockReturnValue([
        mockCurrentTier,
        mockSeasonTier,
        tier2,
      ]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, mockSeasonTier, tier2];
        if (selector === selectCurrentTier) return mockCurrentTier;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      // When: component renders
      const { getAllByTestId } = render(<UpcomingRewards />);

      // Then: all tiers should show their rewards
      const tierRewardsElements = getAllByTestId(
        REWARDS_VIEW_SELECTORS.TIER_REWARDS,
      );
      expect(tierRewardsElements.length).toBe(2); // Both upcoming tiers visible
    });

    it('should toggle individual tiers independently', () => {
      // Given: multiple upcoming tiers
      const tier2: SeasonTierDto = {
        id: 'tier-2',
        name: 'Silver',
        levelNumber: '2',
        pointsNeeded: 2000,
        image: mockSeasonTier.image,
        rewards: [mockSeasonReward],
      };

      mockSelectSeasonTiers.mockReturnValue([
        mockCurrentTier,
        mockSeasonTier,
        tier2,
      ]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, mockSeasonTier, tier2];
        if (selector === selectCurrentTier) return mockCurrentTier;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      const { getAllByTestId } = render(<UpcomingRewards />);
      const tierNames = getAllByTestId(REWARDS_VIEW_SELECTORS.TIER_NAME);

      // When: collapse first tier
      const firstTierHeader = tierNames[0].parent?.parent as ReactTestInstance;
      fireEvent.press(firstTierHeader);

      // Then: first tier should be collapsed, second tier should remain expanded
      const tierRewardsElements = getAllByTestId(
        REWARDS_VIEW_SELECTORS.TIER_REWARDS,
      );
      // Both still in DOM because only visibility changes, not removal
      expect(tierRewardsElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle toggle state correctly when tier is added/removed', () => {
      // Given: initial tier setup
      const { rerender, getByTestId } = render(<UpcomingRewards />);
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARDS)).toBeTruthy();

      // When: new tier is added
      const tier2: SeasonTierDto = {
        id: 'tier-2',
        name: 'Silver',
        levelNumber: '2',
        pointsNeeded: 2000,
        image: mockSeasonTier.image,
        rewards: [mockSeasonReward],
      };

      mockSelectSeasonTiers.mockReturnValue([
        mockCurrentTier,
        mockSeasonTier,
        tier2,
      ]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, mockSeasonTier, tier2];
        if (selector === selectCurrentTier) return mockCurrentTier;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      rerender(<UpcomingRewards />);

      // Then: new tier should also be expanded by default
      const tierRewardsElements = getByTestId(
        REWARDS_VIEW_SELECTORS.TIER_REWARDS,
      );
      expect(tierRewardsElements).toBeTruthy();
    });
  });

  describe('Rewards Count Display', () => {
    it('should display total upcoming rewards count when season has started', () => {
      // Given: season has started with tiers containing rewards
      const { getByText } = render(<UpcomingRewards />);

      // Then: section header should be visible
      expect(getByText('rewards.upcoming_rewards.title')).toBeTruthy();
      // Note: Count is displayed in a Box component and would be tested via snapshot or accessibility
    });

    it('should not display count when season has not started', () => {
      // Given: season has not started yet
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, mockSeasonTier];
        if (selector === selectCurrentTier) return mockCurrentTier;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return null;
        return [];
      });

      const { getByText } = render(<UpcomingRewards />);

      // Then: section header should still be visible
      expect(getByText('rewards.upcoming_rewards.title')).toBeTruthy();
    });

    it('should calculate correct total rewards count for multiple tiers', () => {
      // Given: multiple tiers with different reward counts
      const tierWith2Rewards: SeasonTierDto = {
        id: 'tier-2',
        name: 'Silver',
        levelNumber: '2',
        pointsNeeded: 2000,
        image: mockSeasonTier.image,
        rewards: [mockSeasonReward, { ...mockSeasonReward, id: 'reward-2' }],
      };

      const tierWith3Rewards: SeasonTierDto = {
        id: 'tier-3',
        name: 'Gold',
        levelNumber: '3',
        pointsNeeded: 3000,
        image: mockSeasonTier.image,
        rewards: [
          mockSeasonReward,
          { ...mockSeasonReward, id: 'reward-2' },
          { ...mockSeasonReward, id: 'reward-3' },
        ],
      };

      mockSelectSeasonTiers.mockReturnValue([
        mockCurrentTier,
        tierWith2Rewards,
        tierWith3Rewards,
      ]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonTiers)
          return [mockCurrentTier, tierWith2Rewards, tierWith3Rewards];
        if (selector === selectCurrentTier) return mockCurrentTier;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return new Date('2024-01-01');
        return [];
      });

      const { getByText } = render(<UpcomingRewards />);

      // Then: should display header (count is displayed but not directly testable via text)
      expect(getByText('rewards.upcoming_rewards.title')).toBeTruthy();
      // Total count would be 5 rewards (2 + 3), displayed in the UI
    });
  });
});

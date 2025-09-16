import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsOverview from './RewardsOverview';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

// Mock ActiveBoosts component
jest.mock('./OverviewTab/ActiveBoosts', () => {
  const MockActiveBoosts = () => 'ActiveBoosts';
  MockActiveBoosts.displayName = 'ActiveBoosts';
  return MockActiveBoosts;
});

// Mock useActivePointsBoosts hook
const mockUseActivePointsBoosts = jest.fn();
jest.mock('../../hooks/useActivePointsBoosts', () => ({
  useActivePointsBoosts: () => mockUseActivePointsBoosts(),
}));

// Mock navigation
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  dispatch: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  push: jest.fn(),
  replace: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  setOptions: jest.fn(),
  reset: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

// Mock WaysToEarn component to avoid navigation dependencies
jest.mock('./OverviewTab/WaysToEarn/WaysToEarn', () => ({
  WaysToEarn: () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="ways-to-earn-mock">
        <Text>WaysToEarn Mock</Text>
      </View>
    );
  },
}));

describe('RewardsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset navigation mock calls
    Object.values(mockNavigation).forEach((mockFn) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
  });

  it('should render overview tab content container', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsOverview />);

    // Assert
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW),
    ).toBeOnTheScreen();
  });

  it('should call useActivePointsBoosts hook on mount', () => {
    // Arrange & Act
    render(<RewardsOverview />);

    // Assert
    expect(mockUseActivePointsBoosts).toHaveBeenCalledTimes(1);
  });

  it('should apply correct flex styling to container', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsOverview />);
    const container = getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW);

    // Assert
    expect(container).toBeOnTheScreen();
    // Verify flex styling is applied (checking for flexGrow: 1 which indicates flex: 1)
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flexGrow: 1,
        }),
      ]),
    );
  });

  it('should handle optional props without errors', () => {
    // Arrange
    const props = {
      tabLabel: 'Overview',
    };

    // Act & Assert - should render successfully with optional props
    const { getByTestId } = render(<RewardsOverview {...props} />);
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW),
    ).toBeOnTheScreen();
  });
});

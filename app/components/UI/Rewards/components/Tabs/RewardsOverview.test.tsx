import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsOverview from './RewardsOverview';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

// Mock ActiveBoosts component
jest.mock('./OverviewTab/ActiveBoosts', () => ({
  __esModule: true,
  default: function MockActiveBoosts() {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return React.createElement(
      View,
      { testID: 'active-boosts' },
      React.createElement(Text, null, 'Active Boosts'),
    );
  },
}));

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
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return React.createElement(
      View,
      { testID: 'ways-to-earn-mock' },
      React.createElement(Text, null, 'WaysToEarn Mock'),
    );
  },
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({ flexGrow: 1 })),
  }),
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
    // Verify contentContainerStyle is applied with flexGrow
    expect(container.props.contentContainerStyle).toEqual(
      expect.objectContaining({
        flexGrow: 1,
      }),
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

  it('should render ActiveBoosts component', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsOverview />);

    // Assert
    expect(getByTestId('active-boosts')).toBeOnTheScreen();
  });

  it('should render WaysToEarn component', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsOverview />);

    // Assert
    expect(getByTestId('ways-to-earn-mock')).toBeOnTheScreen();
  });

  it('should hide vertical scroll indicator', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsOverview />);
    const container = getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW);

    // Assert
    expect(container.props.showsVerticalScrollIndicator).toBe(false);
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsLevels from './RewardsLevels';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

// Mock child components
jest.mock('./LevelsTab/UnlockedRewards', () => ({
  __esModule: true,
  default: function MockUnlockedRewards() {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return React.createElement(
      View,
      { testID: 'unlocked-rewards' },
      React.createElement(Text, null, 'Unlocked Rewards'),
    );
  },
}));

jest.mock('./LevelsTab/UpcomingRewards', () => ({
  __esModule: true,
  default: function MockUpcomingRewards() {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return React.createElement(
      View,
      { testID: 'upcoming-rewards' },
      React.createElement(Text, null, 'Upcoming Rewards'),
    );
  },
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

describe('RewardsLevels', () => {
  it('renders successfully', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsLevels />);

    // Assert
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_LEVELS),
    ).toBeOnTheScreen();
  });

  it('renders UnlockedRewards component', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsLevels />);

    // Assert
    expect(getByTestId('unlocked-rewards')).toBeOnTheScreen();
  });

  it('renders UpcomingRewards component', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsLevels />);

    // Assert
    expect(getByTestId('upcoming-rewards')).toBeOnTheScreen();
  });

  it('accepts optional props without breaking', () => {
    // Arrange
    const props = {
      tabLabel: 'Levels',
    };

    // Act & Assert - should not throw
    expect(() => render(<RewardsLevels {...props} />)).not.toThrow();
  });

  it('renders both child components in correct order', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsLevels />);

    // Assert
    const unlockedRewards = getByTestId('unlocked-rewards');
    const upcomingRewards = getByTestId('upcoming-rewards');

    expect(unlockedRewards).toBeOnTheScreen();
    expect(upcomingRewards).toBeOnTheScreen();
  });
});

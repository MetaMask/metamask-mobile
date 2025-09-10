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

describe('RewardsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsOverview />);

    // Assert
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW),
    ).toBeOnTheScreen();
  });

  it('calls useActivePointsBoosts hook', () => {
    // Arrange & Act
    render(<RewardsOverview />);

    // Assert
    expect(mockUseActivePointsBoosts).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing', () => {
    // Arrange & Act & Assert
    expect(() => render(<RewardsOverview />)).not.toThrow();
  });

  it('applies correct styling classes', () => {
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

  it('accepts optional props without breaking', () => {
    // Arrange
    const props = {
      tabLabel: 'Overview',
    };

    // Act & Assert - should not throw
    expect(() => render(<RewardsOverview {...props} />)).not.toThrow();
  });
});

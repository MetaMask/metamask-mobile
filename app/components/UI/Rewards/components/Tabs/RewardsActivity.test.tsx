import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsActivity from './RewardsActivity';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

// Mock ActivityTab component
jest.mock('./ActivityTab/ActivityTab', () => ({
  ActivityTab: () => 'ActivityTab',
}));

describe('RewardsActivity', () => {
  it('renders successfully', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsActivity />);

    // Assert
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_ACTIVITY),
    ).toBeOnTheScreen();
  });

  it('renders without crashing', () => {
    // Arrange & Act & Assert
    expect(() => render(<RewardsActivity />)).not.toThrow();
  });

  it('applies correct styling classes', () => {
    // Arrange & Act
    const { getByTestId } = render(<RewardsActivity />);
    const container = getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_ACTIVITY);

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
      tabLabel: 'Activity',
    };

    // Act & Assert - should not throw
    expect(() => render(<RewardsActivity {...props} />)).not.toThrow();
  });
});

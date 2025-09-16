import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsLevels from './RewardsLevels';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.not_implemented': 'Feature not yet implemented',
    };
    return translations[key] || key;
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

  it('displays not implemented message', () => {
    // Arrange & Act
    const { getByText } = render(<RewardsLevels />);

    // Assert
    expect(getByText('Feature not yet implemented')).toBeOnTheScreen();
  });

  it('accepts optional props without breaking', () => {
    // Arrange
    const props = {
      tabLabel: 'Levels',
    };

    // Act & Assert - should not throw
    expect(() => render(<RewardsLevels {...props} />)).not.toThrow();
  });
});

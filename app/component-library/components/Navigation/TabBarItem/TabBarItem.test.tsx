// Third party dependencies.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies
import TabBarItem from './TabBarItem';

describe('TabBarItem', () => {
  const defaultProps = {
    label: 'Home',
    iconName: IconName.Bank,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tab bar item with icon', () => {
    const { getByTestId } = render(
      <TabBarItem {...defaultProps} testID="tab-item" />,
    );

    expect(getByTestId('tab-item')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    // Arrange
    const mockOnPress = jest.fn();

    // Act
    const { getByTestId } = render(
      <TabBarItem {...defaultProps} onPress={mockOnPress} testID="tab-item" />,
    );
    fireEvent.press(getByTestId('tab-item'));

    // Assert
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('displays label text when provided for non-trade button', () => {
    const { getByText } = render(<TabBarItem {...defaultProps} label="Home" />);

    expect(getByText('Home')).toBeOnTheScreen();
  });
});

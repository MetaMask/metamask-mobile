// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import Tab from './Tab';

describe('Tab', () => {
  const defaultProps = {
    label: 'Test Tab',
    isActive: false,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    // Act
    const { toJSON } = render(<Tab {...defaultProps} />);

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the label text', () => {
    // Act
    const { getByText } = render(<Tab {...defaultProps} label="My Tab" />);

    // Assert
    expect(getByText('My Tab')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    // Arrange
    const mockOnPress = jest.fn();

    // Act
    const { getByText } = render(
      <Tab {...defaultProps} onPress={mockOnPress} />,
    );

    fireEvent.press(getByText('Test Tab'));

    // Assert
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('applies active styling when isActive is true', () => {
    // Act
    const { toJSON } = render(<Tab {...defaultProps} isActive />);

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('applies inactive styling when isActive is false', () => {
    // Act
    const { toJSON } = render(<Tab {...defaultProps} isActive={false} />);

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('applies custom style and textStyle', () => {
    // Arrange
    const customStyle = { backgroundColor: 'red' };
    const customTextStyle = { fontSize: 18 };

    // Act
    const { toJSON } = render(
      <Tab {...defaultProps} style={customStyle} textStyle={customTextStyle} />,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with correct testID', () => {
    // Act
    const { getByTestId } = render(
      <Tab {...defaultProps} testID="custom-tab" />,
    );

    // Assert
    expect(getByTestId('custom-tab')).toBeOnTheScreen();
  });

  it('truncates long labels with numberOfLines=1', () => {
    // Act
    const { getByText } = render(
      <Tab
        {...defaultProps}
        label="This is a very long tab label that should be truncated"
      />,
    );

    // Assert
    expect(
      getByText('This is a very long tab label that should be truncated'),
    ).toBeOnTheScreen();
  });
});

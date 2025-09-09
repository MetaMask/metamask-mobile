import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ButtonHero from './ButtonHero';

describe('ButtonHero', () => {
  const defaultProps = {
    children: 'Test Button',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { getByText } = render(<ButtonHero {...defaultProps} />);

    expect(getByText('Test Button')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ButtonHero {...defaultProps} onPress={mockOnPress} />,
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('verifies disabled state prevents interaction', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ButtonHero
        {...defaultProps}
        testID="disabled-button"
        onPress={mockOnPress}
        isDisabled
      />,
    );

    const button = getByTestId('disabled-button');
    expect(button).toBeDisabled();

    // Attempt to press the disabled button
    fireEvent.press(button);

    // Verify onPress was not called
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('handles loading state correctly', () => {
    const { getByTestId } = render(
      <ButtonHero
        {...defaultProps}
        isLoading
        loadingText="loading..."
        testID="loading-button"
      />,
    );

    const button = getByTestId('loading-button');
    expect(button).toBeOnTheScreen();

    // ButtonBase disables button during loading (correct behavior)
    expect(button).toBeDisabled();

    // ButtonBase sets accessibility label to loading text
    expect(button).toHaveAccessibleName('loading...');
  });

  it('spreads additional props to ButtonBase', () => {
    const customStyle = { marginTop: 20, paddingHorizontal: 10 };

    const { getByTestId } = render(
      <ButtonHero
        {...defaultProps}
        testID="hero-button"
        accessibilityLabel="Hero Button"
        style={customStyle}
      />,
    );

    const button = getByTestId('hero-button');
    expect(button).toBeOnTheScreen();

    // Verify custom styles
    expect(button).toHaveStyle(customStyle);

    // Verify accessibility label is applied
    expect(button).toHaveAccessibleName('Hero Button');
  });
});

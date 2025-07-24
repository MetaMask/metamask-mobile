// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../../components/Icons/Icon';

// Internal dependencies.
import ButtonHero from './ButtonHero';

describe('ButtonHero', () => {
  const mockOnPress = jest.fn();
  const mockOnPressIn = jest.fn();
  const mockOnPressOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with label', () => {
    // Arrange & Act
    const { getByTestId, getByText } = render(
      <ButtonHero
        label="Hero Button"
        onPress={mockOnPress}
        testID="button-hero"
      />,
    );

    // Assert
    expect(getByTestId('button-hero')).toBeOnTheScreen();
    expect(getByText('Hero Button')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    // Arrange
    const { getByTestId } = render(
      <ButtonHero
        label="Press Me"
        onPress={mockOnPress}
        testID="button-hero"
      />,
    );

    // Act
    fireEvent.press(getByTestId('button-hero'));

    // Assert
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('handles press in and press out events', () => {
    // Arrange
    const { getByTestId } = render(
      <ButtonHero
        label="Interactive Button"
        onPress={mockOnPress}
        onPressIn={mockOnPressIn}
        onPressOut={mockOnPressOut}
        testID="button-hero"
      />,
    );

    // Act
    fireEvent(getByTestId('button-hero'), 'onPressIn', {});
    fireEvent(getByTestId('button-hero'), 'onPressOut', {});

    // Assert
    expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    expect(mockOnPressOut).toHaveBeenCalledTimes(1);
  });

  it('is disabled when isDisabled is true', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <ButtonHero
        label="Disabled Button"
        isDisabled
        onPress={mockOnPress}
        testID="button-hero"
      />,
    );

    // Assert
    const buttonElement = getByTestId('button-hero');
    expect(buttonElement).toHaveProp('accessibilityState', { disabled: true });
  });

  it('does not call onPress when disabled', () => {
    // Arrange
    const { getByTestId } = render(
      <ButtonHero
        label="Disabled Button"
        isDisabled
        onPress={mockOnPress}
        testID="button-hero"
      />,
    );

    // Act
    fireEvent.press(getByTestId('button-hero'));

    // Assert
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('displays loading state when loading is true', () => {
    // Arrange & Act
    const { getByTestId, queryByText } = render(
      <ButtonHero
        label="Loading Button"
        loading
        onPress={mockOnPress}
        testID="button-hero"
      />,
    );

    // Assert
    expect(getByTestId('button-hero')).toBeOnTheScreen();
    // Text should not be visible when loading
    expect(queryByText('Loading Button')).not.toBeOnTheScreen();
  });

  it('renders with custom React node label', () => {
    // Arrange
    const customLabel = <div>Custom Label</div>;

    // Act
    const { getByTestId } = render(
      <ButtonHero
        label={customLabel}
        onPress={mockOnPress}
        testID="button-hero"
      />,
    );

    // Assert
    expect(getByTestId('button-hero')).toBeOnTheScreen();
  });

  it('renders with start and end icons', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <ButtonHero
        label="Icon Button"
        startIconName={IconName.Add}
        endIconName={IconName.ArrowRight}
        onPress={mockOnPress}
        testID="button-hero"
      />,
    );

    // Assert
    expect(getByTestId('button-hero')).toBeOnTheScreen();
  });
});

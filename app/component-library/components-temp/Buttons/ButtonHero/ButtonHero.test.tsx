// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../../components/Icons/Icon';

// Internal dependencies.
import ButtonHero from './ButtonHero';
import { BUTTONHERO_TESTID } from './ButtonHero.constants';

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
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Assert
    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
    expect(getByText('Hero Button')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    // Arrange
    const { getByTestId } = render(
      <ButtonHero
        label="Press Me"
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Act
    fireEvent.press(getByTestId(BUTTONHERO_TESTID));

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
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Act
    fireEvent(getByTestId(BUTTONHERO_TESTID), 'onPressIn', {});
    fireEvent(getByTestId(BUTTONHERO_TESTID), 'onPressOut', {});

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
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Assert
    const buttonElement = getByTestId(BUTTONHERO_TESTID);
    expect(buttonElement).toHaveProp('accessibilityState', { disabled: true });
  });

  it('does not call onPress when disabled', () => {
    // Arrange
    const { getByTestId } = render(
      <ButtonHero
        label="Disabled Button"
        isDisabled
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Act
    fireEvent.press(getByTestId(BUTTONHERO_TESTID));

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
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Assert
    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
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
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Assert
    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
  });

  it('renders with start and end icons', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <ButtonHero
        label="Icon Button"
        startIconName={IconName.Add}
        endIconName={IconName.ArrowRight}
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    // Assert
    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
  });
});

// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../../components/Icons/Icon';

// Internal dependencies.
import ButtonHero from './ButtonHero';
import {
  BUTTONHERO_TESTID,
  SAMPLE_BUTTONHERO_PROPS,
} from './ButtonHero.constants';

describe('ButtonHero', () => {
  const mockOnPress = jest.fn();
  const mockOnPressIn = jest.fn();
  const mockOnPressOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByTestId, getByText } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Hero Button"
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
    expect(getByText('Hero Button')).toBeOnTheScreen();
  });

  it('should call onPress when pressed', () => {
    const { getByTestId } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Press Me"
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    fireEvent.press(getByTestId(BUTTONHERO_TESTID));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should handle press in and press out events', () => {
    const { getByTestId } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Interactive Button"
        onPress={mockOnPress}
        onPressIn={mockOnPressIn}
        onPressOut={mockOnPressOut}
        testID={BUTTONHERO_TESTID}
      />,
    );

    fireEvent(getByTestId(BUTTONHERO_TESTID), 'onPressIn', {});
    expect(mockOnPressIn).toHaveBeenCalledTimes(1);

    fireEvent(getByTestId(BUTTONHERO_TESTID), 'onPressOut', {});
    expect(mockOnPressOut).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when isDisabled is true', () => {
    const { getByTestId } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Disabled Button"
        isDisabled
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    const buttonElement = getByTestId(BUTTONHERO_TESTID);
    expect(buttonElement).toHaveProp('accessibilityState', { disabled: true });
  });

  it('should not call onPress when disabled', () => {
    const { getByTestId } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Disabled Button"
        isDisabled
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    fireEvent.press(getByTestId(BUTTONHERO_TESTID));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should render loading state', () => {
    const { getByTestId, queryByText } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Loading Button"
        loading
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
    // Text should not be visible when loading
    expect(queryByText('Loading Button')).not.toBeOnTheScreen();
  });

  it('should render with custom React node label', () => {
    const customLabel = <div>Custom Label</div>;
    const { getByTestId } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label={customLabel}
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
  });

  it('should render with start and end icons', () => {
    const { getByTestId } = render(
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Icon Button"
        startIconName={IconName.Add}
        endIconName={IconName.ArrowRight}
        onPress={mockOnPress}
        testID={BUTTONHERO_TESTID}
      />,
    );

    expect(getByTestId(BUTTONHERO_TESTID)).toBeOnTheScreen();
  });
});

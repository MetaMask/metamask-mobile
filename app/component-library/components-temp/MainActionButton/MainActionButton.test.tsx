// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../components/Icons/Icon';

// Internal dependencies.
import MainActionButton from './MainActionButton';
import { MAINACTIONBUTTON_TEST_ID } from './MainActionButton.constants';

describe('MainActionButton', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={jest.fn}
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render with custom label', () => {
    const customLabel = 'Custom Label';
    const { getByText } = render(
      <MainActionButton
        iconName={IconName.Add}
        label={customLabel}
        onPress={jest.fn}
      />,
    );
    expect(getByText(customLabel)).toBeTruthy();
  });

  it('should be disabled when isDisabled is true', () => {
    const { getByTestId } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={jest.fn}
        isDisabled
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );
    const button = getByTestId(MAINACTIONBUTTON_TEST_ID);
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={mockOnPress}
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );

    fireEvent.press(getByTestId(MAINACTIONBUTTON_TEST_ID));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should call onPressIn and onPressOut when provided', () => {
    const mockOnPressIn = jest.fn();
    const mockOnPressOut = jest.fn();
    const { getByTestId } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={jest.fn}
        onPressIn={mockOnPressIn}
        onPressOut={mockOnPressOut}
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );

    const button = getByTestId(MAINACTIONBUTTON_TEST_ID);
    fireEvent(button, 'pressIn');
    fireEvent(button, 'pressOut');

    expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    expect(mockOnPressOut).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={mockOnPress}
        isDisabled
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );

    fireEvent.press(getByTestId(MAINACTIONBUTTON_TEST_ID));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should not call onPressIn when disabled', () => {
    const mockOnPressIn = jest.fn();
    const { getByTestId } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={jest.fn}
        onPressIn={mockOnPressIn}
        isDisabled
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );

    const button = getByTestId(MAINACTIONBUTTON_TEST_ID);
    fireEvent(button, 'pressIn');

    expect(mockOnPressIn).not.toHaveBeenCalled();
  });

  it('should render with default props when not provided', () => {
    const { getByText } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Default Button"
        onPress={jest.fn}
      />,
    );

    expect(getByText('Default Button')).toBeTruthy();
  });

  it('should render with correct icon and text', () => {
    const { getByText } = render(
      <MainActionButton
        iconName={IconName.BuySell}
        label="Buy/Sell"
        onPress={jest.fn}
      />,
    );

    // Test that the label is rendered
    expect(getByText('Buy/Sell')).toBeTruthy();
  });

  it('should apply custom style when provided', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Styled Button"
        onPress={jest.fn}
        style={customStyle}
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );

    const button = getByTestId(MAINACTIONBUTTON_TEST_ID);
    expect(button.props.style).toContainEqual(
      expect.objectContaining(customStyle),
    );
  });
});

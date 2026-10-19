// Third party dependencies.
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../components/Icons/Icon';

// Internal dependencies.
import MainActionButton from './MainActionButton';
import {
  MAINACTIONBUTTON_CONTENT_TEST_ID,
  MAINACTIONBUTTON_GLASS_TEST_ID,
  MAINACTIONBUTTON_TEST_ID,
} from './MainActionButton.constants';

describe('MainActionButton', () => {
  it('renders with required props', () => {
    const { getByTestId } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={jest.fn}
        testID={MAINACTIONBUTTON_TEST_ID}
      />,
    );

    expect(getByTestId(MAINACTIONBUTTON_TEST_ID)).toBeOnTheScreen();
  });

  it('renders the label text', () => {
    const { getByText } = render(
      <MainActionButton
        iconName={IconName.Add}
        label="Custom Label"
        onPress={jest.fn}
      />,
    );

    expect(getByText('Custom Label')).toBeOnTheScreen();
  });

  it('sets accessibilityState.disabled when isDisabled is true', () => {
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
    expect(button).toBeDisabled();
  });

  it('calls onPress when pressed', () => {
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

  it('fires onPressIn and onPressOut callbacks', () => {
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

  it('does not call onPress when disabled', () => {
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

  it('does not fire onPressIn when disabled', () => {
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

    fireEvent(getByTestId(MAINACTIONBUTTON_TEST_ID), 'pressIn');

    expect(mockOnPressIn).not.toHaveBeenCalled();
  });

  it('applies custom style', () => {
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

    expect(getByTestId(MAINACTIONBUTTON_TEST_ID).props.style).toMatchObject(
      customStyle,
    );
  });

  describe('glass', () => {
    it('keeps the opaque surface by default', () => {
      const { queryByTestId } = render(
        <MainActionButton
          iconName={IconName.Add}
          label="Buy"
          onPress={jest.fn()}
        />,
      );

      expect(
        queryByTestId(MAINACTIONBUTTON_GLASS_TEST_ID),
      ).not.toBeOnTheScreen();
    });

    it('draws the content on an interactive glass surface', () => {
      const onPress = jest.fn();
      const { getByTestId, getByText } = render(
        <MainActionButton
          iconName={IconName.Add}
          label="Buy"
          onPress={onPress}
          testID={MAINACTIONBUTTON_TEST_ID}
          isGlass
        />,
      );

      expect(
        getByTestId(MAINACTIONBUTTON_GLASS_TEST_ID).props.isInteractive,
      ).toBe(true);
      expect(getByText('Buy')).toBeOnTheScreen();

      fireEvent.press(getByTestId(MAINACTIONBUTTON_TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('drops its own fill so only the glass shows', () => {
      const backgroundOf = (isGlass: boolean) =>
        StyleSheet.flatten(
          render(
            <MainActionButton
              iconName={IconName.Add}
              label="Buy"
              onPress={jest.fn()}
              testID={MAINACTIONBUTTON_TEST_ID}
              isGlass={isGlass}
            />,
          ).getByTestId(MAINACTIONBUTTON_TEST_ID).props.style,
        ).backgroundColor;

      expect(backgroundOf(false)).toBeDefined();
      expect(backgroundOf(true)).toBeUndefined();
    });

    it('dims the content, not the glass, while disabled', () => {
      const { getByTestId } = render(
        <MainActionButton
          iconName={IconName.Add}
          label="Buy"
          onPress={jest.fn()}
          testID={MAINACTIONBUTTON_TEST_ID}
          isDisabled
          isGlass
        />,
      );

      expect(getByTestId(MAINACTIONBUTTON_TEST_ID)).toHaveStyle({ opacity: 1 });
      expect(getByTestId(MAINACTIONBUTTON_CONTENT_TEST_ID)).toHaveStyle({
        opacity: 0.5,
      });
    });

    it('keeps the glass static while disabled', () => {
      const { getByTestId } = render(
        <MainActionButton
          iconName={IconName.Add}
          label="Buy"
          onPress={jest.fn()}
          isDisabled
          isGlass
        />,
      );

      expect(
        getByTestId(MAINACTIONBUTTON_GLASS_TEST_ID).props.isInteractive,
      ).toBe(false);
    });
  });
});

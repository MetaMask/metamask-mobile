// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.

// Internal dependencies.
import MarketClosedActionButton from './MarketClosedActionButton';
import { MARKETCLOSED_ACTIONBUTTON_TEST_ID } from './MarketClosedActionButton.constants';
import { IconName } from '../../../../component-library/components/Icons/Icon';

describe('MarketClosedActionButton', () => {
  it('renders correctly', () => {
    const { toJSON } = render(
      <MarketClosedActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={jest.fn}
        testID={MARKETCLOSED_ACTIONBUTTON_TEST_ID}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with custom label', () => {
    const customLabel = 'Custom Label';
    const { getByText } = render(
      <MarketClosedActionButton
        iconName={IconName.Add}
        label={customLabel}
        onPress={jest.fn}
      />,
    );
    expect(getByText(customLabel)).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <MarketClosedActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={mockOnPress}
        testID={MARKETCLOSED_ACTIONBUTTON_TEST_ID}
      />,
    );

    fireEvent.press(getByTestId(MARKETCLOSED_ACTIONBUTTON_TEST_ID));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPressIn and onPressOut when provided', () => {
    const mockOnPressIn = jest.fn();
    const mockOnPressOut = jest.fn();
    const { getByTestId } = render(
      <MarketClosedActionButton
        iconName={IconName.Add}
        label="Test Button"
        onPress={jest.fn}
        onPressIn={mockOnPressIn}
        onPressOut={mockOnPressOut}
        testID={MARKETCLOSED_ACTIONBUTTON_TEST_ID}
      />,
    );

    const button = getByTestId(MARKETCLOSED_ACTIONBUTTON_TEST_ID);
    fireEvent(button, 'pressIn');
    fireEvent(button, 'pressOut');

    expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    expect(mockOnPressOut).toHaveBeenCalledTimes(1);
  });

  it('renders with default props when not provided', () => {
    const { getByText } = render(
      <MarketClosedActionButton
        iconName={IconName.Add}
        label="Default Button"
        onPress={jest.fn}
      />,
    );

    expect(getByText('Default Button')).toBeTruthy();
  });

  it('renders with correct icon and text', () => {
    const { getByText } = render(
      <MarketClosedActionButton
        iconName={IconName.BuySell}
        label="Buy/Sell"
        onPress={jest.fn}
      />,
    );

    // Test that the label is rendered
    expect(getByText('Buy/Sell')).toBeTruthy();
  });

  it('applies custom style when provided', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <MarketClosedActionButton
        iconName={IconName.Add}
        label="Styled Button"
        onPress={jest.fn}
        style={customStyle}
        testID={MARKETCLOSED_ACTIONBUTTON_TEST_ID}
      />,
    );

    const button = getByTestId(MARKETCLOSED_ACTIONBUTTON_TEST_ID);
    expect(button.props.style).toContainEqual(
      expect.objectContaining(customStyle),
    );
  });
});

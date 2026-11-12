import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import CtaButton from './CtaButton';

const TEST_ID = 'cta';

describe('CtaButton', () => {
  it('renders the label and calls onPress', () => {
    const onPress = jest.fn();
    render(<CtaButton label="Open · 50" onPress={onPress} testID={TEST_ID} />);

    fireEvent.press(screen.getByTestId(TEST_ID));

    expect(screen.getByText('Open · 50')).toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses when disabled', () => {
    const onPress = jest.fn();
    render(
      <CtaButton label="Open" onPress={onPress} isDisabled testID={TEST_ID} />,
    );

    fireEvent.press(screen.getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId(TEST_ID)).toBeDisabled();
  });

  it('shows the loading text and ignores presses while loading', () => {
    const onPress = jest.fn();
    render(
      <CtaButton
        label="Confirm and open"
        loadingText="Preparing your pack"
        onPress={onPress}
        isLoading
        testID={TEST_ID}
      />,
    );

    fireEvent.press(screen.getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('Preparing your pack')).toBeOnTheScreen();
  });

  it('renders the end accessory', () => {
    render(
      <CtaButton
        label="Open"
        onPress={jest.fn()}
        endAccessory={<Text testID="usdc-icon">USDC</Text>}
      />,
    );

    expect(screen.getByTestId('usdc-icon')).toBeOnTheScreen();
  });
});

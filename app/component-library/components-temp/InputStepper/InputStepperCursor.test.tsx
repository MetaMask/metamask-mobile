import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { InputStepperCursor } from './InputStepperCursor';
import { INPUTSTEPPER_CURSOR_TESTID } from './InputStepper.constants';

describe('InputStepperCursor', () => {
  it('renders the cursor', () => {
    const { getByTestId } = render(<InputStepperCursor height={40} />);

    expect(getByTestId(INPUTSTEPPER_CURSOR_TESTID)).toBeOnTheScreen();
  });

  it('matches the cursor height to the amount font size', () => {
    const { getByTestId } = render(<InputStepperCursor height={30} />);

    const style = StyleSheet.flatten(
      getByTestId(INPUTSTEPPER_CURSOR_TESTID).props.style as ViewStyle,
    ) as ViewStyle;

    expect(style.height).toBe(30);
  });
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ButtonGlass from './ButtonGlass';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../GlassSurface';

describe('ButtonGlass', () => {
  it('renders the regular secondary button without glass', () => {
    const { getByText, queryByTestId } = render(
      <ButtonGlass isGlass={false} onPress={jest.fn()}>
        Skip
      </ButtonGlass>,
    );

    expect(getByText('Skip')).toBeOnTheScreen();
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
  });

  it('draws the button on the glass sheen and keeps it pressable', () => {
    const onPress = jest.fn();
    const { getByTestId, getByText } = render(
      <ButtonGlass isGlass onPress={onPress} testID="skip">
        Skip
      </ButtonGlass>,
    );

    expect(getByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toBeOnTheScreen();
    expect(getByText('Skip')).toBeOnTheScreen();

    fireEvent.press(getByTestId('skip'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ButtonGlass isGlass isDisabled onPress={onPress} testID="skip">
        Skip
      </ButtonGlass>,
    );

    fireEvent.press(getByTestId('skip'));

    expect(onPress).not.toHaveBeenCalled();
  });
});

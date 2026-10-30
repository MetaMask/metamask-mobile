import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';
import { ButtonVariant } from '@metamask/design-system-react-native';
import ButtonGlass from './ButtonGlass';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../BoxGlass';

let mockIsGlassEnabled = true;
jest.mock('../../hooks/useLiquidGlass', () => {
  const actual = jest.requireActual('../../hooks/useLiquidGlass');
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: mockIsGlassEnabled,
    }),
  };
});

describe('ButtonGlass', () => {
  beforeEach(() => {
    mockIsGlassEnabled = true;
  });

  it('renders the regular button where the OS cannot draw glass', () => {
    mockIsGlassEnabled = false;

    const { getByText, UNSAFE_queryAllByType } = render(
      <ButtonGlass isGlass onPress={jest.fn()}>
        Skip
      </ButtonGlass>,
    );

    expect(getByText('Skip')).toBeOnTheScreen();
    expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);
  });

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

  it('draws glass by default', () => {
    const { getByTestId } = render(
      <ButtonGlass onPress={jest.fn()}>Skip</ButtonGlass>,
    );

    expect(getByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toBeOnTheScreen();
  });

  it('renders primary as the plain button, without glass', () => {
    const onPress = jest.fn();
    const { getByTestId, getByText, queryByTestId, UNSAFE_queryByType } =
      render(
        <ButtonGlass
          isGlass
          variant={ButtonVariant.Primary}
          onPress={onPress}
          testID="add-funds"
        >
          Add funds
        </ButtonGlass>,
      );

    expect(getByText('Add funds')).toBeOnTheScreen();
    expect(UNSAFE_queryByType(GlassView)).toBeNull();
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();

    fireEvent.press(getByTestId('add-funds'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders tertiary as the plain button, without glass', () => {
    const onPress = jest.fn();
    const { getByTestId, getByText, queryByTestId, UNSAFE_queryByType } =
      render(
        <ButtonGlass
          isGlass
          variant={ButtonVariant.Tertiary}
          onPress={onPress}
          testID="upgrade"
        >
          Upgrade
        </ButtonGlass>,
      );

    expect(getByText('Upgrade')).toBeOnTheScreen();
    expect(UNSAFE_queryByType(GlassView)).toBeNull();
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();

    fireEvent.press(getByTestId('upgrade'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

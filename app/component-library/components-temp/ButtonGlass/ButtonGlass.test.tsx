import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { ButtonVariant } from '@metamask/design-system-react-native';
import ButtonGlass from './ButtonGlass';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../BoxGlass';
import { mockTheme } from '../../../util/theme';

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

  it('tints primary glass with the primary fill instead of the sheen', () => {
    const { UNSAFE_getByType, queryByTestId } = render(
      <ButtonGlass variant={ButtonVariant.Primary} onPress={jest.fn()}>
        Add funds
      </ButtonGlass>,
    );

    expect(UNSAFE_getByType(GlassView).props.tintColor).toBe(
      mockTheme.colors.icon.default,
    );
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
  });

  it('draws tertiary as clear glass, with no sheen or tint', () => {
    const { UNSAFE_getByType, queryByTestId } = render(
      <ButtonGlass variant={ButtonVariant.Tertiary} onPress={jest.fn()}>
        Upgrade
      </ButtonGlass>,
    );

    expect(UNSAFE_getByType(GlassView).props.tintColor).toBeUndefined();
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
  });

  it('keeps a solid fill under the glass instead of tinting it', () => {
    const { UNSAFE_getByType, queryByTestId } = render(
      <ButtonGlass
        variant={ButtonVariant.Primary}
        hasSolidFill
        twClassName="bg-success-default"
        onPress={jest.fn()}
      >
        Buy
      </ButtonGlass>,
    );

    expect(UNSAFE_getByType(GlassView).props.tintColor).toBeUndefined();
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
  });

  it('draws on blur when glass is off and blur is requested', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType, UNSAFE_queryAllByType, getByTestId } = render(
      <ButtonGlass
        isGlass={false}
        isBlur
        variant={ButtonVariant.Tertiary}
        onPress={onPress}
        testID="sell"
      >
        Sell
      </ButtonGlass>,
    );

    expect(UNSAFE_getByType(BlurView)).toBeTruthy();
    expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);

    fireEvent.press(getByTestId('sell'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores blur while glass is on', () => {
    const { UNSAFE_queryAllByType } = render(
      <ButtonGlass isBlur onPress={jest.fn()}>
        Skip
      </ButtonGlass>,
    );

    expect(UNSAFE_queryAllByType(BlurView)).toHaveLength(0);
  });
});

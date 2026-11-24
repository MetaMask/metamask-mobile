import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { darkTheme } from '@metamask/design-tokens';
import FloatingActionButtonGlass, {
  FLOATING_ACTION_TINT_OPACITY,
} from './FloatingActionButtonGlass';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../BoxGlass';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

jest.mock('../../hooks/useLiquidGlass', () => {
  const actual = jest.requireActual('../../hooks/useLiquidGlass');
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: true,
    }),
  };
});

const TINT = darkTheme.colors.success.default;

describe('FloatingActionButtonGlass', () => {
  it('draws a secondary as clear glass, without the sheen', () => {
    const { getByText, queryByTestId, UNSAFE_getByType } = render(
      <FloatingActionButtonGlass
        isGlass
        variant={ButtonVariant.Secondary}
        onPress={jest.fn()}
      >
        Sell
      </FloatingActionButtonGlass>,
    );

    expect(getByText('Sell')).toBeOnTheScreen();
    expect(UNSAFE_getByType(GlassView).props.tintColor).toBeUndefined();
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
  });

  it('draws a primary on glass with a translucent tint', () => {
    const onPress = jest.fn();
    const { getByTestId, UNSAFE_getByType } = render(
      <FloatingActionButtonGlass
        isGlass
        variant={ButtonVariant.Primary}
        tintColor={TINT}
        onPress={onPress}
        testID="buy"
      >
        Buy
      </FloatingActionButtonGlass>,
    );

    expect(UNSAFE_getByType(GlassView).props.tintColor).toBe(
      colorWithOpacity(TINT, FLOATING_ACTION_TINT_OPACITY),
    );

    fireEvent.press(getByTestId('buy'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the plain button off glass', () => {
    const { getByText, UNSAFE_queryByType } = render(
      <FloatingActionButtonGlass
        isGlass={false}
        variant={ButtonVariant.Primary}
        tintColor={TINT}
        onPress={jest.fn()}
      >
        Buy
      </FloatingActionButtonGlass>,
    );

    expect(getByText('Buy')).toBeOnTheScreen();
    expect(UNSAFE_queryByType(GlassView)).toBeNull();
  });
});

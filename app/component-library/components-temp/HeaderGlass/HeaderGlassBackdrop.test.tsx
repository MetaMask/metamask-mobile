import React from 'react';
import { StyleSheet, processColor } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { BlurView } from 'expo-blur';
import { makeMutable } from 'react-native-reanimated';
import HeaderGlassBackdrop from './HeaderGlassBackdrop';
import { mockTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

const mockLiquidGlass = {
  isGlassEnabled: false,
  isBlurEnabled: false,
  glassColorScheme: 'dark',
  blurTint: 'systemChromeMaterialDark',
};
jest.mock('../../hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockLiquidGlass,
}));

const backgroundAt = (opacities: number[]) =>
  opacities.map((opacity) =>
    processColor(
      colorWithOpacity(mockTheme.colors.background.default, opacity),
    ),
  );

// The fade sits a few views above the gradient; read the nearest opacity.
const fadeOpacity = (target: ReturnType<typeof screen.getByTestId>) => {
  let node = target.parent;
  while (node) {
    const opacity = StyleSheet.flatten(node.props.style)?.opacity;
    if (opacity !== undefined) {
      return opacity;
    }
    node = node.parent;
  }
  return undefined;
};

describe('HeaderGlassBackdrop', () => {
  beforeEach(() => {
    mockLiquidGlass.isGlassEnabled = false;
    mockLiquidGlass.isBlurEnabled = false;
    mockLiquidGlass.glassColorScheme = 'dark';
  });

  it('draws a dark gradient without blur where blur is unavailable', () => {
    const { getByTestId, UNSAFE_queryAllByType } = render(
      <HeaderGlassBackdrop testID="backdrop" />,
    );

    expect(UNSAFE_queryAllByType(BlurView)).toHaveLength(0);
    expect(getByTestId('backdrop').props.colors).toEqual(
      backgroundAt([1, 0.92, 0.65, 0]),
    );
    expect(getByTestId('backdrop')).toHaveStyle({ height: '90%' });
  });

  it.each([
    ['iOS 26', 'isGlassEnabled'],
    ['iOS < 26', 'isBlurEnabled'],
  ] as const)('blurs and darkens the content behind it on %s', (_, key) => {
    mockLiquidGlass[key] = true;

    const { getByTestId, UNSAFE_getByType } = render(
      <HeaderGlassBackdrop testID="backdrop" />,
    );

    expect(UNSAFE_getByType(BlurView).props.tint).toBe(
      'systemUltraThinMaterialDark',
    );
    expect(getByTestId('backdrop').props.colors).toEqual(
      backgroundAt([0.8, 0.5, 0]),
    );
  });

  it('uses the light material in light mode', () => {
    mockLiquidGlass.isGlassEnabled = true;
    mockLiquidGlass.glassColorScheme = 'light';

    const { UNSAFE_getByType } = render(<HeaderGlassBackdrop />);

    expect(UNSAFE_getByType(BlurView).props.tint).toBe(
      'systemUltraThinMaterialLight',
    );
  });

  it('stays fully on without a scroll distance', () => {
    const { getByTestId } = render(<HeaderGlassBackdrop testID="backdrop" />);

    expect(fadeOpacity(getByTestId('backdrop'))).toBe(1);
  });

  describe('scroll', () => {
    it.each([
      [0, 0],
      [64, 0.5],
      [128, 1],
      [400, 1],
      [-50, 0],
    ])('at %ipx scrolled is at %f opacity', (distance, opacity) => {
      const { getByTestId } = render(
        <HeaderGlassBackdrop
          testID="backdrop"
          scrollDistance={makeMutable(distance)}
        />,
      );

      expect(fadeOpacity(getByTestId('backdrop'))).toBe(opacity);
    });

    it('fades in over a custom distance', () => {
      const { getByTestId } = render(
        <HeaderGlassBackdrop
          testID="backdrop"
          scrollDistance={makeMutable(40)}
          fadeInDistance={40}
        />,
      );

      expect(fadeOpacity(getByTestId('backdrop'))).toBe(1);
    });

    it('builds up the blur strength with the scroll on iOS', () => {
      mockLiquidGlass.isGlassEnabled = true;

      const { getByTestId, UNSAFE_getByType } = render(
        <HeaderGlassBackdrop
          testID="backdrop"
          scrollDistance={makeMutable(64)}
        />,
      );

      expect(UNSAFE_getByType(BlurView).props.intensity).toBe(30);
      expect(fadeOpacity(getByTestId('backdrop'))).toBe(0.5);
    });
  });
});

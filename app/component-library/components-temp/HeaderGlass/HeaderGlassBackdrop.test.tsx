import React from 'react';
import { processColor } from 'react-native';
import { render } from '@testing-library/react-native';
import { BlurView } from 'expo-blur';
import { makeMutable } from 'react-native-reanimated';
import HeaderGlassBackdrop from './HeaderGlassBackdrop';
import { mockTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';
import { backdropFadeOpacity } from './test-utils';

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

  it('fades upward when the opaque edge is the bottom', () => {
    const { getByTestId } = render(
      <HeaderGlassBackdrop testID="backdrop" edge="bottom" />,
    );

    expect(getByTestId('backdrop').props.colors).toEqual(
      backgroundAt([0, 0.65, 0.92, 1]),
    );
    expect(getByTestId('backdrop')).toHaveStyle({ height: '90%', bottom: 0 });
    expect(backdropFadeOpacity(getByTestId('backdrop'))).toBe(1);
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

    expect(backdropFadeOpacity(getByTestId('backdrop'))).toBe(1);
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

      expect(backdropFadeOpacity(getByTestId('backdrop'))).toBe(opacity);
    });

    it('fades in over a custom distance', () => {
      const { getByTestId } = render(
        <HeaderGlassBackdrop
          testID="backdrop"
          scrollDistance={makeMutable(40)}
          fadeInDistance={40}
        />,
      );

      expect(backdropFadeOpacity(getByTestId('backdrop'))).toBe(1);
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
      expect(backdropFadeOpacity(getByTestId('backdrop'))).toBe(0.5);
    });
  });
});

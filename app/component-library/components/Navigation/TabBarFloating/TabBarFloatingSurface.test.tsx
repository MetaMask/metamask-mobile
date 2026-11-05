import React from 'react';
import { Text } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import TabBarFloatingSurface, {
  resolveTabBarMaterial,
} from './TabBarFloatingSurface';
import { TAB_BAR_FLOATING_BLUR_INTENSITY } from './TabBarFloating.constants';

const mockUseLiquidGlass = jest.fn();
jest.mock('../../../hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockUseLiquidGlass(),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => null,
}));

const mockBlurView = jest.fn();
jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BlurView: (props: Record<string, unknown>) => {
      mockBlurView(props);
      return ReactActual.createElement(View, props);
    },
  };
});

const mockGlassView = jest.fn();
jest.mock('expo-glass-effect', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: (props: Record<string, unknown>) => {
      mockGlassView(props);
      return ReactActual.createElement(View, props, props.children);
    },
    isLiquidGlassAvailable: () => false,
  };
});

const TEST_ID = 'surface';

const renderSurface = () =>
  renderWithProvider(
    <TabBarFloatingSurface twClassName="rounded-full" testID={TEST_ID}>
      <Text>Tabs</Text>
    </TabBarFloatingSurface>,
  );

describe('resolveTabBarMaterial', () => {
  it('prefers Liquid Glass, then blur, then an opaque fill', () => {
    expect(
      resolveTabBarMaterial({
        isGlassEnabled: true,
        isBlurEnabled: false,
        networkTier: 'WIFI',
      }),
    ).toBe('glass');
    expect(
      resolveTabBarMaterial({
        isGlassEnabled: false,
        isBlurEnabled: true,
        networkTier: 'SLOW_CELLULAR',
      }),
    ).toBe('blur');
    expect(
      resolveTabBarMaterial({
        isGlassEnabled: false,
        isBlurEnabled: false,
        networkTier: null,
      }),
    ).toBe('opaque');
  });

  it('does not change the material for an unknown network', () => {
    expect(
      resolveTabBarMaterial({
        isGlassEnabled: true,
        isBlurEnabled: true,
        networkTier: null,
      }),
    ).toBe('glass');
  });
});

describe('TabBarFloatingSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: false,
      glassColorScheme: 'dark',
      isBlurEnabled: true,
      blurTint: 'systemChromeMaterialDark',
    });
  });

  it('draws Liquid Glass in the app theme when glass is enabled', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: true,
      glassColorScheme: 'dark',
      isBlurEnabled: false,
      blurTint: 'systemChromeMaterialDark',
    });

    const { getByText } = renderSurface();

    expect(mockGlassView).toHaveBeenCalledWith(
      expect.objectContaining({
        glassEffectStyle: 'regular',
        colorScheme: 'dark',
        isInteractive: true,
      }),
    );
    expect(mockBlurView).not.toHaveBeenCalled();
    expect(getByText('Tabs')).toBeOnTheScreen();
  });

  it('draws a system chrome material where blur is the fallback', () => {
    renderSurface();

    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({
        tint: 'systemChromeMaterialDark',
        intensity: TAB_BAR_FLOATING_BLUR_INTENSITY,
      }),
    );
    expect(mockGlassView).not.toHaveBeenCalled();
  });

  it('matches the blur material to the app theme', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: false,
      glassColorScheme: 'light',
      isBlurEnabled: true,
      blurTint: 'systemChromeMaterialLight',
    });

    renderSurface();

    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({ tint: 'systemChromeMaterialLight' }),
    );
  });

  it('paints a flat fill when no material can be drawn', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: false,
      glassColorScheme: 'dark',
      isBlurEnabled: false,
      blurTint: 'systemChromeMaterialDark',
    });

    const { getByTestId, getByText } = renderSurface();

    expect(getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(getByText('Tabs')).toBeOnTheScreen();
    expect(mockBlurView).not.toHaveBeenCalled();
    expect(mockGlassView).not.toHaveBeenCalled();
  });
});

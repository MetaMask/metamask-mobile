/**
 * Unit coverage for the material switch. GlassView and BlurView are native
 * modules, and the hardware tier is not Redux state, so a component-view
 * test would mock the same boundary.
 */
import React from 'react';
import { Text } from 'react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';
import ElevationSurface from './ElevationSurface';
import { ElevationRole } from './elevation';

const mockGlassView = jest.fn();
const mockBlurView = jest.fn();
let mockReducedMotion = false;
let mockHardwareTier: 'LOW' | 'MID' | 'HIGH' | null = 'HIGH';
let mockNetworkTier: 'WIFI' | 'NONE' | null = 'WIFI';
let mockLiquid = {
  isGlassEnabled: true,
  glassColorScheme: 'dark' as const,
  isBlurEnabled: false,
  blurTint: 'systemChromeMaterialDark' as const,
};

jest.mock('expo-glass-effect', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: (props: Record<string, unknown>) => {
      mockGlassView(props);
      return ReactActual.createElement(View, props);
    },
    isLiquidGlassAvailable: () => false,
  };
});

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

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReducedMotion,
}));

jest.mock('../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockHardwareTier,
}));

jest.mock('../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

jest.mock('../../hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockLiquid,
}));

const renderSurface = (
  props: Partial<React.ComponentProps<typeof ElevationSurface>> = {},
) =>
  renderWithProvider(
    <ElevationSurface role={ElevationRole.Glass} testID="surface" {...props}>
      <Text>Label</Text>
    </ElevationSurface>,
  );

describe('ElevationSurface', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockHardwareTier = 'HIGH';
    mockNetworkTier = 'WIFI';
    mockLiquid = {
      isGlassEnabled: true,
      glassColorScheme: 'dark',
      isBlurEnabled: false,
      blurTint: 'systemChromeMaterialDark',
    };
    mockGlassView.mockClear();
    mockBlurView.mockClear();
  });

  it('draws Liquid Glass in the app theme when the OS and hardware allow it', () => {
    const { getByText } = renderSurface({ isInteractive: true });

    expect(mockGlassView).toHaveBeenCalledWith(
      expect.objectContaining({
        glassEffectStyle: 'regular',
        colorScheme: 'dark',
        isInteractive: true,
      }),
    );
    expect(mockBlurView).not.toHaveBeenCalled();
    expect(getByText('Label')).toBeOnTheScreen();
  });

  it('turns off the glass press response when Reduce Motion is on', () => {
    mockReducedMotion = true;

    renderSurface({ isInteractive: true });

    expect(mockGlassView).toHaveBeenCalledWith(
      expect.objectContaining({ isInteractive: false }),
    );
  });

  it('draws the system blur at the requested intensity when glass is unavailable', () => {
    mockLiquid = {
      ...mockLiquid,
      isGlassEnabled: false,
      isBlurEnabled: true,
      blurTint: 'systemChromeMaterialLight',
    };

    renderSurface({ blurIntensity: 60 });

    expect(mockGlassView).not.toHaveBeenCalled();
    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({
        tint: 'systemChromeMaterialLight',
        intensity: 60,
      }),
    );
  });

  it('draws an opaque section on low hardware even when glass is available', () => {
    mockHardwareTier = 'LOW';

    const { getByTestId, getByText } = renderSurface();

    expect(mockGlassView).not.toHaveBeenCalled();
    expect(mockBlurView).not.toHaveBeenCalled();
    expect(getByTestId('surface')).toBeOnTheScreen();
    expect(getByText('Label')).toBeOnTheScreen();
  });

  it('draws a section fill with no glass for a card role', () => {
    const { getByText } = renderSurface({ role: ElevationRole.Section });

    expect(mockGlassView).not.toHaveBeenCalled();
    expect(mockBlurView).not.toHaveBeenCalled();
    expect(getByText('Label')).toBeOnTheScreen();
  });
});

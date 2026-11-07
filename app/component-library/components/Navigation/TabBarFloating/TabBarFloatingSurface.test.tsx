import React from 'react';
import { Text } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import TabBarFloatingSurface from './TabBarFloatingSurface';
import { TAB_BAR_FLOATING_BLUR_INTENSITY } from './TabBarFloating.constants';

const mockBlurView = jest.fn();
let mockLiquid = {
  isGlassEnabled: false,
  glassColorScheme: 'dark' as const,
  isBlurEnabled: true,
  blurTint: 'systemChromeMaterialDark' as const,
};

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

jest.mock('../../../hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockLiquid,
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

const TEST_ID = 'surface';

describe('TabBarFloatingSurface', () => {
  beforeEach(() => {
    mockBlurView.mockClear();
    mockLiquid = {
      isGlassEnabled: false,
      glassColorScheme: 'dark',
      isBlurEnabled: true,
      blurTint: 'systemChromeMaterialDark',
    };
  });

  it('draws the tab bar at the chrome blur intensity', () => {
    renderWithProvider(
      <TabBarFloatingSurface twClassName="rounded-full" testID={TEST_ID}>
        <Text>Tabs</Text>
      </TabBarFloatingSurface>,
    );

    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({
        tint: 'systemChromeMaterialDark',
        intensity: TAB_BAR_FLOATING_BLUR_INTENSITY,
      }),
    );
  });

  it('matches the material to the app theme', () => {
    mockLiquid = {
      ...mockLiquid,
      blurTint: 'systemChromeMaterialLight',
      glassColorScheme: 'light',
    };

    renderWithProvider(
      <TabBarFloatingSurface testID={TEST_ID}>
        <Text>Tabs</Text>
      </TabBarFloatingSurface>,
    );

    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({ tint: 'systemChromeMaterialLight' }),
    );
  });

  it('paints a flat fill when no blur can be drawn', () => {
    mockLiquid = { ...mockLiquid, isBlurEnabled: false };

    const { getByTestId } = renderWithProvider(
      <TabBarFloatingSurface testID={TEST_ID}>
        <Text>Tabs</Text>
      </TabBarFloatingSurface>,
    );

    expect(getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(mockBlurView).not.toHaveBeenCalled();
  });

  it('renders its children', () => {
    const { getByText } = renderWithProvider(
      <TabBarFloatingSurface testID={TEST_ID}>
        <Text>Tabs</Text>
      </TabBarFloatingSurface>,
    );

    expect(getByText('Tabs')).toBeOnTheScreen();
  });
});

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import SocialHeaderGlassSurface from './SocialHeaderGlassSurface';

const mockUseLiquidGlass = jest.fn();
jest.mock('../../../../../component-library/hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockUseLiquidGlass(),
}));

const mockGlassView = jest.fn();
jest.mock('expo-glass-effect', () => {
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: (props: { children?: React.ReactNode; testID?: string }) => {
      mockGlassView(props);
      return <View testID={props.testID}>{props.children}</View>;
    },
  };
});

const mockBlurView = jest.fn();
jest.mock('expo-blur', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BlurView: (props: { children?: React.ReactNode; testID?: string }) => {
      mockBlurView(props);
      return <View testID={props.testID}>{props.children}</View>;
    },
  };
});

const SURFACE_TEST_ID = 'social-header-glass-surface';

describe('SocialHeaderGlassSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('draws Liquid Glass in the app theme when glass is enabled', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: true,
      glassColorScheme: 'dark',
      isBlurEnabled: false,
      blurTint: 'systemChromeMaterialDark',
    });

    render(
      <SocialHeaderGlassSurface testID={SURFACE_TEST_ID}>
        <Text>child</Text>
      </SocialHeaderGlassSurface>,
    );

    expect(screen.getByTestId(SURFACE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('child')).toBeOnTheScreen();
    expect(mockGlassView).toHaveBeenCalledWith(
      expect.objectContaining({
        glassEffectStyle: 'regular',
        colorScheme: 'dark',
        isInteractive: true,
      }),
    );
  });

  it('blurs the capsule on iOS without Liquid Glass', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: false,
      glassColorScheme: 'light',
      isBlurEnabled: true,
      blurTint: 'systemChromeMaterialLight',
    });

    render(
      <SocialHeaderGlassSurface testID={SURFACE_TEST_ID}>
        <Text>child</Text>
      </SocialHeaderGlassSurface>,
    );

    expect(screen.getByTestId(SURFACE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('child')).toBeOnTheScreen();
    expect(mockGlassView).not.toHaveBeenCalled();
    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({ tint: 'systemChromeMaterialLight' }),
    );
  });

  it('falls back to a plain capsule when glass is unavailable', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: false,
      glassColorScheme: 'light',
      isBlurEnabled: false,
      blurTint: 'systemChromeMaterialLight',
    });

    render(
      <SocialHeaderGlassSurface testID={SURFACE_TEST_ID}>
        <Text>child</Text>
      </SocialHeaderGlassSurface>,
    );

    expect(screen.getByTestId(SURFACE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('child')).toBeOnTheScreen();
    expect(mockGlassView).not.toHaveBeenCalled();
    expect(mockBlurView).not.toHaveBeenCalled();
  });
});

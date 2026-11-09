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

const SURFACE_TEST_ID = 'social-header-glass-surface';

describe('SocialHeaderGlassSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('draws Liquid Glass in the app theme when glass is enabled', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: true,
      glassColorScheme: 'dark',
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

  it('falls back to a plain capsule when glass is unavailable', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: false,
      glassColorScheme: 'light',
    });

    render(
      <SocialHeaderGlassSurface testID={SURFACE_TEST_ID}>
        <Text>child</Text>
      </SocialHeaderGlassSurface>,
    );

    expect(screen.getByTestId(SURFACE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('child')).toBeOnTheScreen();
    expect(mockGlassView).not.toHaveBeenCalled();
  });
});

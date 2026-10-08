import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import GlassCapsule from './GlassCapsule';

const mockUseLiquidGlass = jest.fn();
jest.mock('../../hooks/useLiquidGlass', () => ({
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

const CAPSULE_TEST_ID = 'glass-capsule';

describe('GlassCapsule', () => {
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
      <GlassCapsule testID={CAPSULE_TEST_ID}>
        <Text>child</Text>
      </GlassCapsule>,
    );

    expect(screen.getByTestId(CAPSULE_TEST_ID)).toBeOnTheScreen();
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
      <GlassCapsule testID={CAPSULE_TEST_ID}>
        <Text>child</Text>
      </GlassCapsule>,
    );

    expect(screen.getByTestId(CAPSULE_TEST_ID)).toBeOnTheScreen();
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
      <GlassCapsule testID={CAPSULE_TEST_ID}>
        <Text>child</Text>
      </GlassCapsule>,
    );

    expect(screen.getByTestId(CAPSULE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('child')).toBeOnTheScreen();
    expect(mockGlassView).not.toHaveBeenCalled();
    expect(mockBlurView).not.toHaveBeenCalled();
  });

  it('applies the non-glass classes only where the capsule is bordered', () => {
    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: false,
      glassColorScheme: 'light',
      isBlurEnabled: false,
      blurTint: 'systemChromeMaterialLight',
    });

    render(
      <GlassCapsule testID={CAPSULE_TEST_ID} nonGlassClassName="px-3">
        <Text>child</Text>
      </GlassCapsule>,
    );

    expect(screen.getByTestId(CAPSULE_TEST_ID)).toHaveStyle({
      paddingLeft: 12,
      paddingRight: 12,
    });

    mockUseLiquidGlass.mockReturnValue({
      isGlassEnabled: true,
      glassColorScheme: 'light',
      isBlurEnabled: false,
      blurTint: 'systemChromeMaterialLight',
    });

    render(
      <GlassCapsule testID={CAPSULE_TEST_ID} nonGlassClassName="px-3">
        <Text>child</Text>
      </GlassCapsule>,
    );

    expect(mockGlassView).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.not.objectContaining({ paddingLeft: 12 }),
      }),
    );
  });
});

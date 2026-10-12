import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';

import { useLiquidGlass } from '../../hooks/useLiquidGlass';
import { BLUR_INTENSITY } from '../../hooks/useBlurMaterial';

export interface GlassCapsuleProps {
  children?: React.ReactNode;
  twClassName?: string;
  nonGlassClassName?: string;
  testID?: string;
}

const CAPSULE_CLASS = 'h-10 flex-row items-center overflow-hidden rounded-full';

/**
 * A header capsule drawn as Liquid Glass where the OS can render it, as a
 * blurred system material on older iOS, and as a plain section-coloured
 * capsule everywhere else. Children must not paint their own background on
 * the glass path, or they cover the material.
 */
const GlassCapsule = ({
  children,
  twClassName = '',
  nonGlassClassName = '',
  testID,
}: GlassCapsuleProps) => {
  const tw = useTailwind();
  const { isGlassEnabled, glassColorScheme, isBlurEnabled, blurTint } =
    useLiquidGlass();

  if (isGlassEnabled) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={glassColorScheme}
        isInteractive
        // The native glass only takes the capsule's corners when clipped.
        style={tw.style(CAPSULE_CLASS, twClassName)}
        testID={testID}
      >
        {children}
      </GlassView>
    );
  }

  if (isBlurEnabled) {
    return (
      <BlurView
        tint={blurTint}
        intensity={BLUR_INTENSITY}
        style={tw.style(
          CAPSULE_CLASS,
          'border border-muted',
          twClassName,
          nonGlassClassName,
        )}
        testID={testID}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={tw.style(
        CAPSULE_CLASS,
        'border border-muted bg-section',
        twClassName,
        nonGlassClassName,
      )}
      testID={testID}
    >
      {children}
    </View>
  );
};

export default GlassCapsule;

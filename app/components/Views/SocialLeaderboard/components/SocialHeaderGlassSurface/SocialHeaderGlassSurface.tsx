import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { GlassView } from 'expo-glass-effect';

import { useLiquidGlass } from '../../../../../component-library/hooks/useLiquidGlass';

export interface SocialHeaderGlassSurfaceProps {
  children?: React.ReactNode;
  twClassName?: string;
  testID?: string;
}

/**
 * A header capsule drawn as Liquid Glass where the OS can render it and as a
 * plain section-coloured capsule everywhere else. Same material rule as the
 * glass trade menu, so the Social header matches the rest of the chrome.
 *
 * Children must not paint their own background on the glass path, or they
 * cover the material.
 */
const SocialHeaderGlassSurface = ({
  children,
  twClassName = '',
  testID,
}: SocialHeaderGlassSurfaceProps) => {
  const tw = useTailwind();
  const { isGlassEnabled, glassColorScheme } = useLiquidGlass();

  if (isGlassEnabled) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={glassColorScheme}
        isInteractive
        // The glass is a native layer, so it only takes the capsule's corners
        // when the view clips to them.
        style={tw.style(
          'h-10 flex-row items-center overflow-hidden rounded-full',
          twClassName,
        )}
        testID={testID}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <Box
      twClassName={`h-10 flex-row items-center rounded-full border border-muted bg-section ${twClassName}`}
      testID={testID}
    >
      {children}
    </Box>
  );
};

export default SocialHeaderGlassSurface;

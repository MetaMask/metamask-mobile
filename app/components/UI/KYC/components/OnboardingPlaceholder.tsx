import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * Stand-in header graphic. Swap this node for a Rive animation when it lands.
 */
const VbaOnboardingPlaceholder = () => {
  const tw = useTailwind();
  const color = tw.color('icon-default') ?? 'currentColor';

  return (
    <Svg width={64} height={64} viewBox="0 0 96 96">
      <Circle
        cx="48"
        cy="48"
        r="28"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M34 52 L48 34 L62 52 L48 46 Z"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default VbaOnboardingPlaceholder;

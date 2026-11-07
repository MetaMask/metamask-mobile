import {
  FontFamily,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import AnimatedNumericText from '#app/component-library/components-temp/AnimatedNumericText/AnimatedNumericText';
import { getHardwareTier } from '#app/util/deviceCapability';

export interface AnimatedCountProps {
  value: number;
}

/**
 * A feed count whose digits animate when the value changes while mounted. The
 * first value renders without motion. Reduced motion and LOW-tier hardware
 * keep the count static, as `ReactionChip` does.
 */
const AnimatedCount: React.FC<AnimatedCountProps> = ({ value }) => {
  const prefersReducedMotion = useReducedMotion();
  // Unknown hardware keeps the animation, matching ReactionChip.
  const isAnimated = !prefersReducedMotion && getHardwareTier() !== 'LOW';

  return (
    <AnimatedNumericText
      animated={isAnimated}
      color={TextColor.TextAlternative}
      fontFamily={FontFamily.Default}
      value={String(value)}
      variant={TextVariant.BodySm}
    />
  );
};

export default AnimatedCount;

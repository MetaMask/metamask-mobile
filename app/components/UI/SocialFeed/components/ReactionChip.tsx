import {
  ButtonBase,
  ButtonBaseSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { getHardwareTier } from '../../../../util/deviceCapability';

/**
 * Hairline outline for the add-reaction control. Reaction chips use the same
 * border treatment with a muted fill and their own padding.
 */
export const REACTION_PILL_TW_CLASS = 'bg-transparent border';

export interface EmojiWindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReactionChipProps {
  emotion: string;
  count: number;
  /** The viewer's own reaction: outlined a step stronger. */
  isSelected?: boolean;
  onPress?: () => void;
  testID?: string;
  /** Set when this emoji should throw a burst. Measures the glyph, not the chip. */
  burstNonce?: number;
  onBurstAnchor?: (nonce: number, frame: EmojiWindowFrame) => void;
}

const POP_IN = ZoomIn.springify().damping(14).stiffness(240).duration(280);
const POP_OUT = ZoomOut.duration(140);
const SHIFT = LinearTransition.springify().damping(18).stiffness(220);

/**
 * One emoji + count in the engagement row. Tapping it toggles the viewer's
 * reaction to that emoji. New chips pop in and removal shrinks out. The
 * emoji itself does not scale on tap.
 */
const ReactionChip: React.FC<ReactionChipProps> = ({
  emotion,
  count,
  isSelected = false,
  onPress,
  testID,
  burstNonce,
  onBurstAnchor,
}) => {
  const prefersReducedMotion = useReducedMotion();
  // A pop per chip is cheap, but it is still motion a LOW device pays for on
  // every reaction in a scrolling list. Unknown hardware keeps the default.
  const isAnimated = !prefersReducedMotion && getHardwareTier() !== 'LOW';
  const emojiRef = useRef<View>(null);

  useEffect(() => {
    if (burstNonce == null) {
      return;
    }
    const nonce = burstNonce;
    emojiRef.current?.measureInWindow((x, y, width, height) => {
      onBurstAnchor?.(nonce, { x, y, width, height });
    });
  }, [burstNonce, onBurstAnchor]);

  return (
    <Animated.View
      entering={isAnimated ? POP_IN : FadeIn.duration(0)}
      exiting={isAnimated ? POP_OUT : FadeOut.duration(0)}
      layout={isAnimated ? SHIFT : undefined}
    >
      <ButtonBase
        size={ButtonBaseSize.Sm}
        startAccessory={
          <View ref={emojiRef} collapsable={false}>
            <Text variant={TextVariant.BodySm}>{emotion}</Text>
          </View>
        }
        textProps={{
          variant: TextVariant.BodySm,
          color: TextColor.TextAlternative,
        }}
        twClassName={`border bg-muted px-2 ${
          isSelected ? 'border-default' : 'border-muted'
        }`}
        accessibilityState={{ selected: isSelected }}
        onPress={onPress}
        testID={testID}
      >
        {String(count)}
      </ButtonBase>
    </Animated.View>
  );
};

export default ReactionChip;

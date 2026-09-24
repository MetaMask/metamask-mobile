import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FEED_REACTION_EMOJIS } from '../reactions';
import { ReactionPickerBalloonSelectorsIDs } from './ReactionPickerBalloon.testIds';

export interface ReactionPickerAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReactionPickerBalloonProps {
  visible: boolean;
  anchor: ReactionPickerAnchor | null;
  onClose: () => void;
  onPick: (emotion: string) => void;
}

const BALLOON_HEIGHT = 48;
const BALLOON_GAP = 8;
const EMOJI_SLOT = 36;
const TRAY_PADDING = 16;

interface PickerEmojiProps {
  emotion: string;
  onPick: (emotion: string) => void;
}

const PickerEmoji: React.FC<PickerEmojiProps> = ({ emotion, onPick }) => {
  const tw = useTailwind();
  const prefersReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!prefersReducedMotion) {
      scale.value = withSequence(
        withTiming(0.72, { duration: 80 }),
        withSpring(1, { damping: 11, stiffness: 280 }),
      );
    }
    onPick(emotion);
  };

  return (
    <Pressable
      accessibilityRole="button"
      testID={`${ReactionPickerBalloonSelectorsIDs.EMOJI}-${emotion}`}
      onPress={handlePress}
      style={tw.style('h-9 w-9 items-center justify-center rounded-full')}
    >
      <Animated.View style={animatedStyle}>
        <Text variant={TextVariant.BodyMd}>{emotion}</Text>
      </Animated.View>
    </Pressable>
  );
};

const ReactionPickerBalloon: React.FC<ReactionPickerBalloonProps> = ({
  visible,
  anchor,
  onClose,
  onPick,
}) => {
  const tw = useTailwind();
  const { width: windowWidth } = useWindowDimensions();

  if (!visible || !anchor) {
    return null;
  }

  const contentWidth = FEED_REACTION_EMOJIS.length * EMOJI_SLOT + TRAY_PADDING;
  const originX = Math.max(8, anchor.x);
  const maxTrayWidth = Math.max(120, windowWidth - originX - 8);
  const trayWidth = Math.min(contentWidth, maxTrayWidth);
  const top = Math.max(8, anchor.y - BALLOON_HEIGHT - BALLOON_GAP);
  const left = Math.min(originX, windowWidth - trayWidth - 8);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        testID={ReactionPickerBalloonSelectorsIDs.SCRIM}
        onPress={onClose}
        style={tw.style('absolute inset-0')}
      />
      <Box
        testID={ReactionPickerBalloonSelectorsIDs.BALLOON}
        twClassName="absolute overflow-hidden rounded-full bg-background-elevated1 shadow-lg"
        style={tw.style({
          top,
          left,
          width: trayWidth,
          height: BALLOON_HEIGHT,
        })}
      >
        <ScrollView
          horizontal
          nestedScrollEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          testID={ReactionPickerBalloonSelectorsIDs.STRIP}
          contentContainerStyle={tw.style('items-center px-2 py-1')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            {FEED_REACTION_EMOJIS.map((emotion) => (
              <PickerEmoji key={emotion} emotion={emotion} onPick={onPick} />
            ))}
          </Box>
        </ScrollView>
      </Box>
    </Modal>
  );
};

export default ReactionPickerBalloon;

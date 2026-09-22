import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Modal, Pressable, useWindowDimensions } from 'react-native';
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

  const estimatedWidth = FEED_REACTION_EMOJIS.length * 36 + 16;
  const top = Math.max(8, anchor.y - BALLOON_HEIGHT - BALLOON_GAP);
  const left = Math.min(
    Math.max(8, anchor.x + anchor.width / 2 - estimatedWidth / 2),
    windowWidth - estimatedWidth - 8,
  );

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
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        testID={ReactionPickerBalloonSelectorsIDs.BALLOON}
        twClassName="absolute rounded-full bg-default px-2 py-1 shadow-lg"
        style={tw.style({ top, left })}
      >
        {FEED_REACTION_EMOJIS.map((emotion) => (
          <Pressable
            key={emotion}
            accessibilityRole="button"
            testID={`${ReactionPickerBalloonSelectorsIDs.EMOJI}-${emotion}`}
            onPress={() => onPick(emotion)}
            style={tw.style('h-9 w-9 items-center justify-center rounded-full')}
          >
            <Text variant={TextVariant.BodyMd}>{emotion}</Text>
          </Pressable>
        ))}
      </Box>
    </Modal>
  );
};

export default ReactionPickerBalloon;

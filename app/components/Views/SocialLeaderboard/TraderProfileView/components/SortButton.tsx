import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface SortButtonProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

const SortButton: React.FC<SortButtonProps> = ({ label, onPress, testID }) => {
  const tw = useTailwind();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) =>
        tw.style('flex-row items-center', pressed && 'opacity-70')
      }
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {label}
        </Text>
        <Icon
          name={IconName.SwapVertical}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Pressable>
  );
};

export default SortButton;

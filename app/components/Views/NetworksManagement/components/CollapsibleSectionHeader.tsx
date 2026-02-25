import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

interface CollapsibleSectionHeaderProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const CollapsibleSectionHeader = ({
  title,
  isExpanded,
  onToggle,
}: CollapsibleSectionHeaderProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center justify-between px-4 my-4',
          pressed && 'opacity-70',
        )
      }
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {title}
        </Text>
        <Icon
          name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Pressable>
  );
};

export default React.memo(CollapsibleSectionHeader);

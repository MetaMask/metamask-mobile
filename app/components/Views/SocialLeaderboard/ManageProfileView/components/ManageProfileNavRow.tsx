import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { type ReactNode } from 'react';
import { Pressable } from 'react-native';

interface ManageProfileNavRowProps {
  label: string;
  testID: string;
  onPress: () => void;
  value?: string;
  showTopBorder?: boolean;
  valueAccessory?: ReactNode;
}

const ManageProfileNavRow: React.FC<ManageProfileNavRowProps> = ({
  label,
  testID,
  onPress,
  value,
  showTopBorder = false,
  valueAccessory,
}) => (
  <Pressable accessibilityRole="button" onPress={onPress} testID={testID}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={`px-4 py-3 ${showTopBorder ? 'border-t border-muted' : ''}`}
    >
      <Text variant={TextVariant.BodyMd}>{label}</Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-shrink min-w-0 ml-4"
        gap={2}
      >
        {valueAccessory}
        {value ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            twClassName="flex-shrink"
          >
            {value}
          </Text>
        ) : null}
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Box>
  </Pressable>
);

export default ManageProfileNavRow;

import React from 'react';

import Pressable from '../../../../../component-library/components-temp/Pressable';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

export interface TimePeriodButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TimePeriodButton: React.FC<TimePeriodButtonProps> = ({
  label,
  isActive,
  onPress,
}) => (
  <Pressable onPress={onPress}>
    <Box
      twClassName={`flex-1 items-center justify-center px-2 py-1 rounded ${
        isActive ? 'bg-muted' : ''
      }`}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </Pressable>
);

export default TimePeriodButton;

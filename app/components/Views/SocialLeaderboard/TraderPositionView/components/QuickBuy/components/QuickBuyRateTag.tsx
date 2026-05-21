import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

interface QuickBuyRateTagProps {
  label: string | undefined;
  onPress?: () => void;
}

const QuickBuyRateTag: React.FC<QuickBuyRateTagProps> = ({
  label,
  onPress,
}) => {
  if (!label) return null;

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Box>
  );

  return (
    <Box
      twClassName="rounded-full bg-muted px-3 py-1"
      testID="quick-buy-rate-tag"
    >
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          testID="quick-buy-rate-tag-pressable"
        >
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </Box>
  );
};

export default QuickBuyRateTag;

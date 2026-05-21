import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

interface QuickBuyRateTagProps {
  label: string | undefined;
  onPress?: () => void;
}

const QuickBuyRateTag: React.FC<QuickBuyRateTagProps> = ({ label }) => {
  if (!label) return null;

  return (
    <Box
      twClassName="rounded-full bg-muted px-3 py-1"
      testID="quick-buy-rate-tag"
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
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={TextColor.IconAlternative}
        />
      </Box>
    </Box>
  );
};

export default QuickBuyRateTag;

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
import { strings } from '../../../../../../../../locales/i18n';

interface QuickBuyRateTagProps {
  label: string | undefined;
  onPress?: () => void;
  isHighPriceImpact?: boolean;
}

const QuickBuyRateTag: React.FC<QuickBuyRateTagProps> = ({
  label,
  onPress,
  isHighPriceImpact = false,
}) => {
  if (!label && !isHighPriceImpact) return null;

  const displayLabel = isHighPriceImpact
    ? strings('bridge.price_impact_warning_title')
    : label;

  const textColor = isHighPriceImpact
    ? TextColor.ErrorDefault
    : TextColor.TextDefault;

  const iconColor = isHighPriceImpact
    ? IconColor.ErrorDefault
    : IconColor.IconDefault;

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      testID="quick-buy-rate-tag"
    >
      <Text variant={TextVariant.BodySm} color={textColor}>
        {displayLabel}
      </Text>
      {onPress ? (
        <Icon name={IconName.ArrowRight} size={IconSize.Sm} color={iconColor} />
      ) : null}
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        testID="quick-buy-rate-tag-pressable"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default QuickBuyRateTag;

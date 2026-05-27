import React from 'react';
import { TouchableOpacity } from 'react-native';
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
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';

interface QuickBuyRateTagProps {
  formattedRate?: string;
  isLoading: boolean;
  onPress: () => void;
}

const QuickBuyRateTag: React.FC<QuickBuyRateTagProps> = ({
  formattedRate,
  isLoading,
  onPress,
}) => {
  const tw = useTailwind();

  if (!isLoading && !formattedRate) {
    return null;
  }

  if (isLoading) {
    return (
      <Skeleton
        width={120}
        height={24}
        style={tw.style('rounded-full')}
        testID="quick-buy-rate-tag-skeleton"
      />
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID="quick-buy-rate-tag"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="bg-muted rounded-full px-2 py-1"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {formattedRate}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Xs}
          color={IconColor.IconDefault}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default QuickBuyRateTag;

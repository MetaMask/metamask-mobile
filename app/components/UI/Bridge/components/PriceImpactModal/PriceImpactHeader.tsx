import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface PriceImpactHeaderProps {
  onClose: () => void;
  iconName?: IconName;
  iconColor?: IconColor;
  content: string;
}

export function PriceImpactHeader({
  onClose,
  iconColor,
  iconName,
  content,
}: PriceImpactHeaderProps) {
  return (
    <Box
      paddingHorizontal={2}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName={'py-2'}
    >
      <Box twClassName="flex-1" />
      <Box alignItems={BoxAlignItems.Center}>
        {iconColor && iconName && (
          <Icon name={iconName} size={IconSize.Xl} color={iconColor} />
        )}
        <Text variant={TextVariant.HeadingMd} twClassName={'text-center mt-4'}>
          {strings(content)}
        </Text>
      </Box>
      <Box
        twClassName="flex-1"
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.End}
      >
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={onClose}
        />
      </Box>
    </Box>
  );
}

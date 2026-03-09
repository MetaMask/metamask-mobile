import React from 'react';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName as DSIconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PriceImpactModalType } from './constants';

interface PriceImpactHeaderProps {
  type: PriceImpactModalType;
  onClose: () => void;
  warningIconName?: IconName;
  warningIconColor?: string;
}

export function PriceImpactHeader({
  type,
  onClose,
  warningIconName,
  warningIconColor,
}: PriceImpactHeaderProps) {
  const isWarning = Boolean(warningIconName && warningIconColor);
  const title =
    type === PriceImpactModalType.Execution
      ? strings('bridge.price_impact_high')
      : strings('bridge.price_impact');

  return (
    <Box
      paddingHorizontal={2}
      flexDirection={BoxFlexDirection.Row}
      alignItems={isWarning ? BoxAlignItems.Start : BoxAlignItems.Center}
      twClassName={isWarning ? 'py-2' : 'min-h-14'}
    >
      <Box twClassName="flex-1" />
      <Box alignItems={BoxAlignItems.Center}>
        {isWarning && warningIconName && warningIconColor && (
          <Icon
            name={warningIconName}
            size={IconSize.Xl}
            color={warningIconColor}
          />
        )}
        <Text
          variant={isWarning ? TextVariant.HeadingMd : TextVariant.BodyMd}
          fontWeight={isWarning ? undefined : FontWeight.Bold}
          twClassName={isWarning ? 'text-center mt-2' : 'text-center'}
        >
          {title}
        </Text>
      </Box>
      <Box
        twClassName="flex-1"
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.End}
      >
        <ButtonIcon
          iconName={DSIconName.Close}
          size={ButtonIconSize.Md}
          onPress={onClose}
        />
      </Box>
    </Box>
  );
}

import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MoneySectionHeaderTestIds } from './MoneySectionHeader.testIds';

interface MoneySectionHeaderProps {
  /**
   * Section title text (should be a localized string)
   */
  title: string;
  /**
   * When provided, renders a chevron and makes the header tappable
   */
  onPress?: () => void;
  /**
   * When provided, renders an info icon button next to the title
   */
  onInfoPress?: () => void;
  /**
   * Accessibility label for the info icon button
   */
  infoAccessibilityLabel?: string;
  /**
   * Optional override for the info icon button testID. When omitted the
   * shared `MoneySectionHeaderTestIds.INFO_BUTTON` value is used so existing
   * callers keep working unchanged.
   */
  infoTestID?: string;
}

const MoneySectionHeader = ({
  title,
  onPress,
  onInfoPress,
  infoAccessibilityLabel,
  infoTestID,
}: MoneySectionHeaderProps) => {
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-1"
    >
      <Text
        variant={TextVariant.HeadingMd}
        testID={MoneySectionHeaderTestIds.TITLE}
      >
        {title}
      </Text>
      {onInfoPress && (
        <ButtonIcon
          iconName={IconName.Info}
          iconProps={{ color: IconColor.IconAlternative }}
          size={ButtonIconSize.Sm}
          onPress={onInfoPress}
          accessibilityLabel={infoAccessibilityLabel}
          testID={infoTestID ?? MoneySectionHeaderTestIds.INFO_BUTTON}
        />
      )}
      {onPress && (
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
          testID={MoneySectionHeaderTestIds.CHEVRON}
        />
      )}
    </Box>
  );

  if (onPress) {
    return <TouchableOpacity onPress={handlePress}>{content}</TouchableOpacity>;
  }

  return content;
};

export default MoneySectionHeader;

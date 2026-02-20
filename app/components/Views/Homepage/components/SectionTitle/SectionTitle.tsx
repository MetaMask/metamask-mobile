import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Box,
  Text,
  ButtonIcon,
  IconName,
  ButtonIconSize,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextColor,
} from '@metamask/design-system-react-native';
import SectionRow from '../SectionRow';

interface SectionTitleProps {
  /**
   * The title text or React node to display
   */
  title: string | React.ReactNode;
  /**
   * Optional callback when the title or arrow is pressed
   */
  onPress?: () => void;
  /**
   * Optional accessory element to display next to the title (e.g., info button)
   */
  endAccessory?: React.ReactNode;
}

const SectionTitle = ({ title, onPress, endAccessory }: SectionTitleProps) => (
  <SectionRow>
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={typeof title === 'string' ? title : undefined}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        {/* Left side: Title + optional endAccessory */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          {typeof title === 'string' ? (
            <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
              {title}
            </Text>
          ) : (
            title
          )}
          {endAccessory}
        </Box>

        {/* Right side: Arrow icon (visual indicator, passes touch to parent) */}
        {onPress && (
          <View pointerEvents="none">
            <ButtonIcon
              iconName={IconName.ArrowRight}
              size={ButtonIconSize.Sm}
            />
          </View>
        )}
      </Box>
    </TouchableOpacity>
  </SectionRow>
);

export default SectionTitle;

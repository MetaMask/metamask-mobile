import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  ButtonIcon,
  IconName,
  ButtonIconSize,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
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
}

const SectionTitle = ({ title, onPress }: SectionTitleProps) => (
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
        gap={1}
      >
        {typeof title === 'string' ? (
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {title}
          </Text>
        ) : (
          title
        )}
        {onPress && (
          <ButtonIcon iconName={IconName.ArrowRight} size={ButtonIconSize.Sm} />
        )}
      </Box>
    </TouchableOpacity>
  </SectionRow>
);

export default SectionTitle;

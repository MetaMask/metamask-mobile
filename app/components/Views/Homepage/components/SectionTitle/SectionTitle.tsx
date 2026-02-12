import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  TextColor,
  IconColor,
} from '@metamask/design-system-react-native';
import SectionRow from '../SectionRow';

interface SectionTitleProps {
  title: string | React.ReactNode;
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
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        )}
      </Box>
    </TouchableOpacity>
  </SectionRow>
);

export default SectionTitle;

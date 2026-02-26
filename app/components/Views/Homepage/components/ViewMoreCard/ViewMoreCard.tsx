import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxAlignItems,
  BoxJustifyContent,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface ViewMoreCardProps {
  onPress: () => void;
  /** Tailwind classes for the card dimensions, e.g. "w-[180px] h-[140px]" */
  twClassName: string;
  textVariant?: TextVariant;
  activeOpacity?: number;
  testID?: string;
}

/**
 * Shared "View more" card shown at the end of a horizontal carousel.
 * Renders a circular ArrowRight icon above a label, blending with the background.
 */
const ViewMoreCard: React.FC<ViewMoreCardProps> = ({
  onPress,
  twClassName,
  textVariant = TextVariant.BodyMd,
  activeOpacity,
  testID,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={activeOpacity}
    testID={testID}
  >
    <Box
      twClassName={twClassName}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
    >
      <Box
        twClassName="w-12 h-12 rounded-full bg-background-muted"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Box>
      <Text
        variant={textVariant}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings('homepage.sections.view_more')}
      </Text>
    </Box>
  </TouchableOpacity>
);

export default ViewMoreCard;

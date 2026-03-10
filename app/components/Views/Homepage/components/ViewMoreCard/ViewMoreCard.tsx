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
 * Renders an ArrowRight icon above a label on a muted background.
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
      twClassName={`rounded-xl bg-background-muted ${twClassName}`}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
    >
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Md}
        color={IconColor.IconDefault}
      />
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

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
import { strings } from '../../../../../../../locales/i18n';

interface ViewMoreCardProps {
  onPress: () => void;
}

/**
 * "View more" card shown at the end of the trending markets carousel.
 * Matches the height and width of PredictMarketCard for visual consistency.
 * Blends with the background and shows a circular arrow icon above the label.
 */
const ViewMoreCard: React.FC<ViewMoreCardProps> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Box
      twClassName="w-[180px] h-[180px]"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      padding={4}
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
        variant={TextVariant.BodyLg}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings('homepage.sections.view_more')}
      </Text>
    </Box>
  </TouchableOpacity>
);

export default ViewMoreCard;

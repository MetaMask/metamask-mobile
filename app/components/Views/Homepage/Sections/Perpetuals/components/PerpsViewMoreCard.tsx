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

interface PerpsViewMoreCardProps {
  onPress: () => void;
}

/**
 * "View more" card shown at the end of the trending markets carousel.
 * Matches the dimensions of PerpsMarketTileCard (180×140) for visual consistency.
 * Blends with the background and shows a circular arrow icon above the label.
 */
const PerpsViewMoreCard: React.FC<PerpsViewMoreCardProps> = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    testID="perps-view-more-card"
  >
    <Box
      twClassName="w-[180px] h-[140px]"
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
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings('homepage.sections.view_more')}
      </Text>
    </Box>
  </TouchableOpacity>
);

export default PerpsViewMoreCard;

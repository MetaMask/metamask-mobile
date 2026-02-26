import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
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
 * "More perps" card shown at the end of the trending markets carousel.
 * Matches the dimensions of PerpsMarketTileCard (180×140) for visual consistency.
 */
const PerpsViewMoreCard: React.FC<PerpsViewMoreCardProps> = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    testID="perps-view-more-card"
  >
    <Box
      twClassName="w-[180px] h-[140px] rounded-xl bg-background-muted"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings('homepage.sections.more_perps')}
      </Text>
    </Box>
  </TouchableOpacity>
);

export default PerpsViewMoreCard;

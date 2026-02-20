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

interface ViewMoreCardProps {
  onPress: () => void;
}

/**
 * "More predictions" card shown at the end of the trending markets carousel.
 * Matches the height and width of PredictMarketCard for visual consistency.
 */
const ViewMoreCard: React.FC<ViewMoreCardProps> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Box
      twClassName="w-[280px] h-[160px] rounded-2xl bg-background-muted"
      padding={4}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      <Text
        variant={TextVariant.BodyLg}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings('homepage.sections.more_predictions')}
      </Text>
    </Box>
  </TouchableOpacity>
);

export default ViewMoreCard;

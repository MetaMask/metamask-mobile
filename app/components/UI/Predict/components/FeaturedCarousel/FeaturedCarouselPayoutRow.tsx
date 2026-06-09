import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { formatPrice } from '../../utils/format';
import { BET_AMOUNT, getPayoutDisplay } from './FeaturedCarouselCard.utils';

interface FeaturedCarouselPayoutRowProps {
  price: number;
}

const FeaturedCarouselPayoutRow: React.FC<FeaturedCarouselPayoutRowProps> = ({
  price,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="mt-1 gap-1"
  >
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {formatPrice(BET_AMOUNT)} {String.fromCharCode(0x2192)}
    </Text>
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.SuccessDefault}
      fontWeight={FontWeight.Medium}
    >
      {getPayoutDisplay(price)}
    </Text>
  </Box>
);

export default FeaturedCarouselPayoutRow;

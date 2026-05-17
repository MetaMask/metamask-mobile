import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatVolume } from '../../utils/format';

interface FeaturedCarouselCardFooterProps {
  testID?: string;
  remainingOptions: number;
  timeText: string | null;
  totalVolume: number;
}

const FeaturedCarouselCardFooter: React.FC<FeaturedCarouselCardFooterProps> = ({
  testID,
  remainingOptions,
  timeText,
  totalVolume,
}) => (
  <Box
    testID={testID}
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    alignItems={BoxAlignItems.Center}
    twClassName="mt-4"
  >
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {remainingOptions > 0 &&
        `+ ${remainingOptions} ${strings(
          remainingOptions === 1
            ? 'predict.outcomes_singular'
            : 'predict.outcomes_plural',
        )}`}
    </Text>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-1"
    >
      {timeText && (
        <>
          <Icon
            name={IconName.Clock}
            size={IconSize.Xs}
            color={IconColor.IconAlternative}
          />
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {timeText}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            ·
          </Text>
        </>
      )}
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        ${formatVolume(totalVolume)} {strings('predict.volume_abbreviated')}
      </Text>
    </Box>
  </Box>
);

export default FeaturedCarouselCardFooter;

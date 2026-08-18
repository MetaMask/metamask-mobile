import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  IconColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { BenefitItem } from '../Benefits.constants';
import { BenefitsTestIds } from '../Benefits.testIds';
import { strings } from '../../../../../../../locales/i18n';

interface BenefitRowProps {
  item: BenefitItem;
  onPress: (item: BenefitItem) => void;
}

const BenefitRow = ({ item, onPress }: BenefitRowProps) => (
  <TouchableOpacity
    onPress={() => onPress(item)}
    accessibilityRole="button"
    accessibilityLabel={strings(item.title)}
    testID={BenefitsTestIds.BENEFIT_ROW(item.id)}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="py-3 gap-x-4"
    >
      {/* Check circle */}
      <Icon
        name={IconName.Check}
        size={IconSize.Lg}
        color={IconColor.IconDefault}
        twClassName="shrink-0"
      />

      {/* Text block */}
      <Box twClassName="flex-1 flex-col gap-y-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings(item.title)}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(item.subtitle)}
        </Text>
      </Box>

      <Box twClassName="self-center ml-2">
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Box>
  </TouchableOpacity>
);

export default BenefitRow;

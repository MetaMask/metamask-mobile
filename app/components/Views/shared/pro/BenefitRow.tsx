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
import type { BenefitItem } from './benefits.constants';
import { BenefitRowTestIds } from './BenefitRow.testIds';
import { strings } from '../../../../../locales/i18n';

interface BenefitRowProps {
  item: BenefitItem;
  /** When omitted, the row is non-interactive. */
  onPress?: (item: BenefitItem) => void;
  /** Trailing disclosure arrow. Defaults to true when `onPress` is provided. */
  showArrow?: boolean;
  /** Selected plan — used to resolve plan-specific copy variants. */
  selectedPlan?: string;
}

const BenefitRow = ({
  item,
  onPress,
  showArrow = Boolean(onPress),
  selectedPlan,
}: BenefitRowProps) => {
  const subtitleKey =
    selectedPlan === 'monthly' && item.subtitleMonthly
      ? item.subtitleMonthly
      : item.subtitle;
  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="py-3 gap-x-4"
    >
      <Icon
        name={IconName.CheckBold}
        size={IconSize.Lg}
        color={IconColor.IconDefault}
        twClassName="shrink-0"
      />

      <Box twClassName="flex-1 flex-col gap-y-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings(item.title)}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(subtitleKey)}
        </Text>
      </Box>

      {showArrow ? (
        <Box twClassName="self-center ml-2">
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      ) : null}
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={strings(item.title)}
        testID={BenefitRowTestIds.ROW(item.id)}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <Box
      accessibilityLabel={strings(item.title)}
      testID={BenefitRowTestIds.ROW(item.id)}
    >
      {content}
    </Box>
  );
};

export default BenefitRow;

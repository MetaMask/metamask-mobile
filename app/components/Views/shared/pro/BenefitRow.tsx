import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  const tw = useTailwind();
  const subtitleKey =
    selectedPlan === 'monthly' && item.subtitleMonthly
      ? item.subtitleMonthly
      : item.subtitle;
  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      className="w-full py-2.5 gap-x-3"
    >
      <Icon
        name={IconName.CheckBold}
        size={IconSize.Md}
        color={IconColor.IconDefault}
        className="shrink-0 mt-0.5"
      />

      <Box className="flex-1 min-w-0 flex-col gap-y-0.5">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings(item.title)}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings(subtitleKey)}
        </Text>
      </Box>

      {showArrow ? (
        <Box className="self-center ml-2 shrink-0">
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
        style={tw.style('w-full')}
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
      className="w-full"
    >
      {content}
    </Box>
  );
};

export default BenefitRow;

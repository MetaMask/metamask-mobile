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
  /**
   * Trailing info affordance. Defaults to true when `onPress` is provided.
   *
   * An info icon rather than a disclosure chevron: tapping a row opens a
   * detail sheet in place, it does not push a new screen.
   */
  showInfoIcon?: boolean;
  /** Selected plan — used to resolve plan-specific copy variants. */
  selectedPlan?: string;
}

const BenefitRow = ({
  item,
  onPress,
  showInfoIcon = Boolean(onPress),
  selectedPlan,
}: BenefitRowProps) => {
  const subtitleKey =
    selectedPlan === 'monthly' && item.subtitleMonthly
      ? item.subtitleMonthly
      : item.subtitle;
  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      /*
       * Centre-aligned: the leading icon now sits against the two-line
       * title/subtitle block as a whole rather than being nudged to the first
       * line, which is what `Start` + `mt-0.5` were doing.
       */
      alignItems={BoxAlignItems.Center}
      twClassName="py-2.5 gap-x-3"
    >
      <Icon
        name={item.iconName}
        size={IconSize.Md}
        color={IconColor.IconDefault}
        twClassName="shrink-0"
      />

      <Box twClassName="flex-1 flex-col gap-y-0.5">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings(item.title)}
        </Text>
        {/*
          Two lines is the design constraint the subtitle copy is written to.
          Clamped so a long translation degrades by truncating rather than by
          pushing the row to an arbitrary height.
        */}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={2}
        >
          {strings(subtitleKey)}
        </Text>
      </Box>

      {showInfoIcon ? (
        <Box twClassName="self-center ml-2">
          <Icon
            name={IconName.Info}
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

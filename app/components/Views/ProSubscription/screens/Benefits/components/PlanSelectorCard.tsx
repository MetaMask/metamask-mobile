import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  Tag,
  TagSeverity,
  FontWeight,
} from '@metamask/design-system-react-native';
import { PLAN_IDS, type PlanOption } from '../Benefits.constants';
import { BenefitsTestIds } from '../Benefits.testIds';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { AppThemeKey } from '../../../../../../util/theme/models';
import type { PlanSelectorCardCopy } from '../utils/getMoneyAccountPlusPricingCopy';

interface PlanSelectorCardProps {
  plan: PlanOption;
  copy: PlanSelectorCardCopy;
  isSelected: boolean;
  onPress: (planId: PlanOption['id']) => void;
}

const PlanSelectorCard = ({
  plan,
  copy,
  isSelected,
  onPress,
}: PlanSelectorCardProps) => {
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;
  const showAnnualTrialBanner =
    plan.id === PLAN_IDS.annual && Boolean(copy.trialLabel);
  const showMonthlyTrialLabel =
    plan.id === PLAN_IDS.monthly && Boolean(copy.trialLabel);

  let radioIndicatorBgClass = 'bg-background-section border';
  if (isSelected) {
    radioIndicatorBgClass = isDark ? 'bg-white' : 'bg-black';
  }

  let annualTrialBannerBgClass = 'bg-background-muted';
  // Inverted surface when selected, so the label needs the inverse foreground
  // token rather than text-default.
  let annualTrialTextClass: string = TextColor.TextAlternative;
  if (isSelected) {
    annualTrialBannerBgClass = isDark ? 'bg-white' : 'bg-black';
    annualTrialTextClass = 'text-icon-inverse';
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(plan.id)}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={plan.id}
      testID={BenefitsTestIds.PLAN_CARD(plan.id)}
      activeOpacity={1}
    >
      <Box
        twClassName={`rounded-2xl overflow-hidden bg-background-section border ${isSelected ? 'border-border-default' : 'border-transparent'}`}
      >
        {showAnnualTrialBanner ? (
          <Box
            twClassName={`items-center py-0.5 ${annualTrialBannerBgClass}`}
            testID={BenefitsTestIds.PLAN_CARD_TRIAL(plan.id)}
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              twClassName={`text-center ${annualTrialTextClass}`}
            >
              {copy.trialLabel}
            </Text>
          </Box>
        ) : null}

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="p-4 flex flex-row items-center justify-between"
        >
          {/* Plan details */}
          <Box twClassName="flex flex-col gap-y-1">
            {/* Label + save badge */}
            <Box twClassName="flex flex-row gap-x-2 items-center">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                {strings(plan.label)}
              </Text>

              {copy.savingsBadge ? (
                <Tag
                  severity={TagSeverity.Info}
                  startIconName={IconName.Tag}
                  twClassName="self-center"
                  testID={BenefitsTestIds.PLAN_CARD_SAVINGS_BADGE(plan.id)}
                >
                  {copy.savingsBadge}
                </Tag>
              ) : null}

              {showMonthlyTrialLabel ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  testID={BenefitsTestIds.PLAN_CARD_TRIAL(plan.id)}
                >
                  {copy.trialLabel}
                </Text>
              ) : null}
            </Box>

            {/* Price row */}
            <Box twClassName="flex flex-row gap-x-1 items-center">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                testID={BenefitsTestIds.PLAN_CARD_PRICE(plan.id)}
              >
                {copy.price}
              </Text>
              {copy.subPrice ? (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  testID={BenefitsTestIds.PLAN_CARD_SUB_PRICE(plan.id)}
                >
                  {copy.subPrice}
                </Text>
              ) : null}
            </Box>
          </Box>

          {/* Radio indicator */}
          <Box
            twClassName={`w-8 h-8 shrink-0 rounded-full items-center justify-center ${radioIndicatorBgClass} border-border-muted`}
            testID={BenefitsTestIds.PLAN_CARD_RADIO(plan.id)}
          >
            {isSelected && (
              <Icon
                name={IconName.CheckBold}
                size={IconSize.Sm}
                color={IconColor.IconInverse}
              />
            )}
          </Box>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default PlanSelectorCard;

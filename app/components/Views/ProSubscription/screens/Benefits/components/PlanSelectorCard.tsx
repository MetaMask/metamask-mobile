import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  isDisabled?: boolean;
  onPress: (planId: PlanOption['id']) => void;
}

interface AnnualTrialBannerProps {
  planId: PlanOption['id'];
  trialLabel?: string;
  isSelected: boolean;
}

interface PlanSelectorDetailsProps {
  plan: PlanOption;
  copy: PlanSelectorCardCopy;
}

interface PlanSelectorRadioProps {
  planId: PlanOption['id'];
  isSelected: boolean;
}

const getPlanCardAccessibilityLabel = (
  plan: PlanOption,
  copy: PlanSelectorCardCopy,
) => {
  const showAnnualTrialBanner =
    plan.id === PLAN_IDS.annual && Boolean(copy.trialLabel);
  const showMonthlyTrialLabel =
    plan.id === PLAN_IDS.monthly && Boolean(copy.trialLabel);

  return [
    showAnnualTrialBanner ? copy.trialLabel : undefined,
    strings(plan.label),
    copy.savingsBadge,
    showMonthlyTrialLabel ? copy.trialLabel : undefined,
    copy.price,
    copy.subPrice,
  ]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(', ');
};

const AnnualTrialBanner = ({
  planId,
  trialLabel,
  isSelected,
}: AnnualTrialBannerProps) => {
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;
  const showBanner = planId === PLAN_IDS.annual && Boolean(trialLabel);

  if (!showBanner) {
    return null;
  }

  let bannerBgClass = 'bg-background-muted';
  // Inverted surface when selected, so the label needs the inverse foreground
  // token rather than text-default.
  let bannerTextClass: string = TextColor.TextAlternative;
  if (isSelected) {
    bannerBgClass = isDark ? 'bg-white' : 'bg-black';
    bannerTextClass = 'text-icon-inverse';
  }

  return (
    <Box
      twClassName={`items-center py-0.5 ${bannerBgClass}`}
      testID={BenefitsTestIds.PLAN_CARD_TRIAL(planId)}
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        twClassName={`text-center ${bannerTextClass}`}
      >
        {trialLabel}
      </Text>
    </Box>
  );
};

const PlanSelectorDetails = ({ plan, copy }: PlanSelectorDetailsProps) => {
  const showMonthlyTrialLabel =
    plan.id === PLAN_IDS.monthly && Boolean(copy.trialLabel);

  return (
    <Box twClassName="flex flex-1 min-w-0 flex-col gap-y-1 pr-2">
      <Box twClassName="flex flex-row flex-wrap gap-x-2 gap-y-1 items-center">
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

      <Box twClassName="flex flex-row flex-wrap gap-x-1 gap-y-1 items-center">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          twClassName="shrink"
          testID={BenefitsTestIds.PLAN_CARD_PRICE(plan.id)}
        >
          {copy.price}
        </Text>
        {copy.subPrice ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="shrink"
            testID={BenefitsTestIds.PLAN_CARD_SUB_PRICE(plan.id)}
          >
            {copy.subPrice}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

const PlanSelectorRadio = ({ planId, isSelected }: PlanSelectorRadioProps) => {
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;

  let radioIndicatorBgClass = 'bg-background-section border';
  if (isSelected) {
    radioIndicatorBgClass = isDark ? 'bg-white' : 'bg-black';
  }

  return (
    <Box
      twClassName={`w-8 h-8 shrink-0 rounded-full items-center justify-center ${radioIndicatorBgClass} border-border-muted`}
      testID={BenefitsTestIds.PLAN_CARD_RADIO(planId)}
    >
      {isSelected && (
        <Icon
          name={IconName.CheckBold}
          size={IconSize.Sm}
          color={IconColor.IconInverse}
        />
      )}
    </Box>
  );
};

const PlanSelectorCard = ({
  plan,
  copy,
  isSelected,
  isDisabled = false,
  onPress,
}: PlanSelectorCardProps) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      onPress={() => onPress(plan.id)}
      disabled={isDisabled}
      style={tw.style(isDisabled && 'opacity-50')}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
      accessibilityLabel={getPlanCardAccessibilityLabel(plan, copy)}
      testID={BenefitsTestIds.PLAN_CARD(plan.id)}
      activeOpacity={1}
    >
      <Box
        twClassName={`rounded-2xl overflow-hidden bg-background-section border ${isSelected ? 'border-border-default' : 'border-transparent'}`}
      >
        <AnnualTrialBanner
          planId={plan.id}
          trialLabel={copy.trialLabel}
          isSelected={isSelected}
        />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="p-4 flex flex-row items-center justify-between"
        >
          <PlanSelectorDetails plan={plan} copy={copy} />
          <PlanSelectorRadio planId={plan.id} isSelected={isSelected} />
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default PlanSelectorCard;

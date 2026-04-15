import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyOnboardingCardTestIds } from './MoneyOnboardingCard.testIds';

interface MoneyOnboardingCardProps {
  /**
   * Handler fired when the "Add" action is pressed. Opens the Add money sheet (MUSD-487).
   */
  onAddPress?: () => void;
  /**
   * 1-based index of the currently completed step. Defaults to 1.
   */
  currentStep?: number;
  /**
   * Total number of onboarding steps. Defaults to 2.
   */
  totalSteps?: number;
}

const ProgressBar = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const safeTotal = Math.max(1, total);
  const percent = Math.min(100, Math.max(0, (current / safeTotal) * 100));

  return (
    <Box
      twClassName="h-2 w-full rounded-full bg-success-muted overflow-hidden"
      testID={MoneyOnboardingCardTestIds.PROGRESS_BAR}
    >
      <Box
        twClassName="h-full bg-success-default"
        style={{ width: `${percent}%` }}
      />
    </Box>
  );
};

const MoneyOnboardingCard = ({
  onAddPress = () => undefined,
  currentStep = 1,
  totalSteps = 2,
}: MoneyOnboardingCardProps) => (
  <Box
    twClassName="mx-4 my-3 rounded-2xl bg-muted overflow-hidden"
    testID={MoneyOnboardingCardTestIds.CONTAINER}
  >
    <Box twClassName="p-4 gap-2">
      <Text
        variant={TextVariant.HeadingSm}
        fontWeight={FontWeight.Bold}
        testID={MoneyOnboardingCardTestIds.STEP_LABEL}
      >
        {strings('money.onboarding.step_progress', {
          current: currentStep,
          total: totalSteps,
        })}
      </Text>
      <ProgressBar current={currentStep} total={totalSteps} />
    </Box>

    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-[202px]"
      testID={MoneyOnboardingCardTestIds.COIN_ILLUSTRATION}
    >
      <Icon
        name={IconName.Stake}
        size={IconSize.Xl}
        color={IconColor.IconAlternative}
      />
    </Box>

    <Box twClassName="p-4 gap-4">
      <Box twClassName="gap-1">
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          testID={MoneyOnboardingCardTestIds.TITLE}
        >
          {strings('money.onboarding.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={MoneyOnboardingCardTestIds.DESCRIPTION}
        >
          {strings('money.onboarding.description')}
        </Text>
      </Box>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onAddPress}
        testID={MoneyOnboardingCardTestIds.ADD_BUTTON}
      >
        {strings('money.onboarding.add')}
      </Button>
    </Box>
  </Box>
);

export default MoneyOnboardingCard;

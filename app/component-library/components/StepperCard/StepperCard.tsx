import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SegmentedProgressBar from '../SegmentedProgressBar/SegmentedProgressBar';
import type { StepperCardProps } from './StepperCard.types';
import { strings } from '../../../../locales/i18n';

const StepperCard = ({
  steps,
  currentStep,
  onComplete,
  testID,
}: StepperCardProps) => {
  const tw = useTailwind();

  const getTestId = (suffix: string) =>
    testID ? `${testID}-${suffix}` : undefined;

  if (currentStep >= steps.length) {
    onComplete?.();
    return null;
  }

  const step = steps[currentStep];
  const totalSteps = steps.length;

  return (
    <Box
      twClassName="rounded-2xl bg-muted overflow-hidden"
      testID={getTestId('container')}
    >
      {/* Progress Bar */}
      <Box twClassName="p-4 gap-2">
        <SegmentedProgressBar
          current={currentStep + 1}
          total={totalSteps}
          testID={getTestId('progress-bar')}
        />
      </Box>

      {/* Image */}
      <Box
        alignItems={BoxAlignItems.Center}
        testID={getTestId('step-image')}
        twClassName="px-4 h-[215px]"
      >
        <Image
          source={step.image}
          style={tw.style('w-full h-full')}
          resizeMode="contain"
        />
      </Box>

      {/* Content */}
      <Box twClassName="p-4 gap-4">
        <Box twClassName="gap-1">
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            testID={getTestId('title')}
          >
            {step.title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={getTestId('description')}
          >
            {step.description}
            {step.onDescriptionTooltipPress && (
              <TouchableOpacity
                onPress={step.onDescriptionTooltipPress}
                accessibilityLabel={
                  step.descriptionTooltipAccessibilityLabel ??
                  strings('stepper_card.more_information')
                }
                accessibilityRole="button"
              >
                <Icon
                  name={IconName.Info}
                  color={IconColor.IconAlternative}
                  size={IconSize.Sm}
                  style={tw.style('top-0.75 left-1')}
                />
              </TouchableOpacity>
            )}
          </Text>
        </Box>

        {/* CTAs */}
        <Box twClassName="flex-row gap-3">
          {step.secondaryCta && (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={step.secondaryCta.onPress}
              twClassName="flex-1"
            >
              {step.secondaryCta.text}
            </Button>
          )}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={step.primaryCta.onPress}
            twClassName="flex-1"
            testID={getTestId('cta-button')}
          >
            {step.primaryCta.text}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default StepperCard;

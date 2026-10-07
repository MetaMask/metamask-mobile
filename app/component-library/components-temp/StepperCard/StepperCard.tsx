import React, { useEffect, useRef } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import {
  Box,
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
import { strings } from '../../../../locales/i18n';
import { StepperCardProps } from './StepperCard.types';
import GlassSurface from '../GlassSurface';
import ButtonGlass from '../ButtonGlass';

// Matches the opaque card's `rounded-3xl`.
const CARD_RADIUS = 24;

const StepperCard = ({
  steps,
  currentStep,
  onComplete,
  testID,
  isGlass = false,
}: StepperCardProps) => {
  const tw = useTailwind();

  const getTestId = (suffix: string) =>
    testID ? `${testID}-${suffix}` : undefined;

  const isComplete = currentStep >= steps.length;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (isComplete && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onCompleteRef.current?.();
    }
  }, [isComplete]);

  if (isComplete) {
    return null;
  }

  const step = steps[currentStep];

  const content = (
    <>
      {/* Image */}
      <Box twClassName="p-4">
        <Box testID={getTestId('step-image')} twClassName="w-full aspect-video">
          {step.media ?? (
            <Image
              source={step.image}
              style={tw.style('w-full h-full')}
              resizeMode="contain"
            />
          )}
        </Box>
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
                testID={getTestId('description-tooltip')}
              >
                <Icon
                  name={IconName.Info}
                  color={IconColor.IconAlternative}
                  size={IconSize.Sm}
                  style={tw.style('top-0.8 left-1')}
                />
              </TouchableOpacity>
            )}
          </Text>
        </Box>

        {/* CTAs */}
        <Box twClassName="flex-row gap-3">
          {step.secondaryCta && (
            <ButtonGlass
              isGlass={isGlass}
              size={ButtonSize.Lg}
              onPress={step.secondaryCta.onPress}
              isDisabled={step.secondaryCta.disabled}
              containerStyle={tw.style('flex-1')}
            >
              {step.secondaryCta.text}
            </ButtonGlass>
          )}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={step.primaryCta.onPress}
            isDisabled={step.primaryCta.disabled}
            twClassName="flex-1"
            testID={getTestId('cta-button')}
          >
            {step.primaryCta.text}
          </Button>
        </Box>
      </Box>
    </>
  );

  if (isGlass) {
    return (
      <GlassSurface
        borderRadius={CARD_RADIUS}
        hasSheen
        testID={getTestId('container')}
      >
        {content}
      </GlassSurface>
    );
  }

  return (
    <Box
      twClassName="rounded-3xl bg-muted overflow-hidden"
      testID={getTestId('container')}
    >
      {content}
    </Box>
  );
};

export default StepperCard;

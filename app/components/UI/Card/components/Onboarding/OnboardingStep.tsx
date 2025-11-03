import React from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import MM_CARD_MOCKUP from '../../../../../images/mm-card-mockup.png';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface OnboardingStepProps {
  title: string;
  description: string;
  formFields: React.ReactNode;
  actions: React.ReactNode;
}

const OnboardingStep = ({
  title,
  description,
  formFields,
  actions,
}: OnboardingStepProps) => {
  const tw = useTailwind();

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={tw.style('flex-grow p-4')}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
    >
      <Box twClassName="flex-1 items-stretch gap-4 mb-6">
        {/* Card Mockup Image */}
        <Box twClassName="items-center">
          <Image
            source={MM_CARD_MOCKUP}
            style={tw.style('w-full h-52')}
            resizeMode="contain"
          />
        </Box>
        <Box twClassName="gap-2">
          {/* Title */}
          <Text
            variant={TextVariant.HeadingMd}
            testID="onboarding-step-title"
            twClassName="text-center text-default"
          >
            {title}
          </Text>

          {/* Description */}
          <Text
            variant={TextVariant.BodyMd}
            testID="onboarding-step-description"
            twClassName="text-center"
          >
            {description}
          </Text>
        </Box>
        {/* Form */}
        <Box testID="onboarding-step-form" twClassName="gap-4 flex-1">
          {formFields}
        </Box>

        {/* Actions */}
        <Box testID="onboarding-step-actions" twClassName="mt-2">
          {actions}
        </Box>
      </Box>
    </KeyboardAwareScrollView>
  );
};

export default OnboardingStep;

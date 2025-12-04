import React from 'react';
import { Platform } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={tw.style('flex-grow px-4')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === 'android' ? 20 : 0}
      >
        <Box twClassName="flex-1 items-stretch gap-4 mb-6">
          <Box twClassName="gap-4 my-2">
            {/* Title */}
            <Text
              variant={TextVariant.HeadingLg}
              testID="onboarding-step-title"
              twClassName="text-default"
            >
              {title}
            </Text>

            {/* Description */}
            <Text
              variant={TextVariant.BodyMd}
              testID="onboarding-step-description"
              twClassName="text-text-alternative"
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
    </SafeAreaView>
  );
};

export default OnboardingStep;

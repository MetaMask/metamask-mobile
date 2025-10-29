import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import FOX_LOGO from '../../../../../images/branding/fox.png';

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
    <KeyboardAvoidingView
      style={tw.style('flex-1')}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={tw.style('flex-1')} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={tw.style('flex-grow px-4 pt-6 pb-6')}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >
          <Box twClassName="flex-1 items-stretch gap-6">
            {/* FOX Logo */}
            <Box twClassName="items-center">
              <Image
                source={FOX_LOGO}
                style={tw.style('w-16 h-16')}
                resizeMode="contain"
              />
            </Box>

            {/* Title */}
            <Text
              variant={TextVariant.HeadingMd}
              testID="onboarding-step-title"
              twClassName="mt-2 text-center text-default"
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

            {/* Form */}
            <Box testID="onboarding-step-form" twClassName="gap-4 flex-1">
              {formFields}
            </Box>

            {/* Actions */}
            <Box testID="onboarding-step-actions" twClassName="mt-2">
              {actions}
            </Box>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default OnboardingStep;

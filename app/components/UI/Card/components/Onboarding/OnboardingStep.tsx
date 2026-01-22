import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OnboardingStepProps {
  title: string;
  description: string;
  formFields: React.ReactNode;
  actions: React.ReactNode;
  /**
   * When true, keeps the action button visible above the keyboard.
   * Use for screens with few fields (e.g., phone number, email confirmation).
   * @default false
   */
  stickyActions?: boolean;
}

const OnboardingStep = ({
  title,
  description,
  formFields,
  actions,
  stickyActions = false,
}: OnboardingStepProps) => {
  const tw = useTailwind();

  const renderContent = () => (
    <>
      {/* Title and Description - prevent from shrinking when keyboard opens */}
      <Box twClassName="gap-4 my-2 shrink-0">
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
    </>
  );

  if (stickyActions) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-background-default')}
        edges={['bottom']}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw.style('flex-1')}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            contentContainerStyle={tw.style('flex-grow px-4')}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            <Box twClassName="flex-1 items-stretch gap-4 mb-6">
              {renderContent()}
            </Box>
          </ScrollView>

          {/* Actions - Fixed at bottom, visible above keyboard */}
          <Box testID="onboarding-step-actions" twClassName="px-4 pb-6">
            {actions}
          </Box>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
        extraScrollHeight={Platform.OS === 'android' ? 120 : 20}
        keyboardShouldPersistTaps="handled"
      >
        <Box twClassName="flex-1 items-stretch gap-4 mb-6">
          {renderContent()}

          {/* Actions - Inside scroll view */}
          <Box testID="onboarding-step-actions" twClassName="mt-2">
            {actions}
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default OnboardingStep;

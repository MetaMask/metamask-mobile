import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export const VbaOnboardingStatusScreenSelectorsIDs = {
  CONTAINER: 'vba-onboarding-status-screen',
  VISUAL: 'vba-onboarding-status-screen-visual',
  ACTION: 'vba-onboarding-status-screen-action',
} as const;

export interface VbaOnboardingStatusAction {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface VbaOnboardingStatusScreenProps {
  /**
   * Centered illustration. Pass a Rive animation when one is ready.
   */
  visual: React.ReactNode;
  title: string;
  description?: string;
  /**
   * Bottom action. The caller decides where it goes.
   */
  action?: VbaOnboardingStatusAction;
  testID?: string;
}

/**
 * Centered VBA onboarding status. The graphic, title, and description sit in
 * the space above an optional bottom action. No back header or list.
 */
const VbaOnboardingStatusScreen = ({
  visual,
  title,
  description,
  action,
  testID = VbaOnboardingStatusScreenSelectorsIDs.CONTAINER,
}: VbaOnboardingStatusScreenProps) => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={testID}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 px-4"
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="w-full">
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName="h-16 w-full justify-center"
            testID={VbaOnboardingStatusScreenSelectorsIDs.VISUAL}
          >
            {visual}
          </Box>
          <Text variant={TextVariant.HeadingLg} twClassName="mt-6 text-center">
            {title}
          </Text>
          {description ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-2 text-center"
            >
              {description}
            </Text>
          ) : null}
        </Box>
      </Box>
      {action ? (
        <Box twClassName="px-4 pb-4 pt-2.5">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={action.onPress}
            testID={
              action.testID ?? VbaOnboardingStatusScreenSelectorsIDs.ACTION
            }
          >
            {action.label}
          </Button>
        </Box>
      ) : null}
    </SafeAreaView>
  );
};

export default VbaOnboardingStatusScreen;

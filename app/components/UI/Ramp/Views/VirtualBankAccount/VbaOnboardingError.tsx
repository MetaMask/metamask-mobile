import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';

export type VbaOnboardingErrorVariant = 'account_provisioning_error' | 'error';

export const VbaOnboardingErrorSelectorsIDs = {
  CONTAINER: 'vba-onboarding-error-container',
  BACK_BUTTON: 'vba-onboarding-error-back-button',
  RETRY_BUTTON: 'vba-onboarding-error-retry-button',
} as const;

interface VbaOnboardingErrorProps {
  variant: VbaOnboardingErrorVariant;
  onRetry: () => void | Promise<void>;
}

/**
 * Shown when VBA onboarding cannot continue. Retry rehydrates so a recovered
 * snapshot can leave this page. Account creation failure and the generic
 * setup error share this screen.
 */
const VbaOnboardingError = ({ variant, onRetry }: VbaOnboardingErrorProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleRetry = useCallback(async () => {
    if (isRetrying) {
      return;
    }
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, onRetry]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: VbaOnboardingErrorSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={`${VbaOnboardingErrorSelectorsIDs.CONTAINER}-${variant}`}
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.ErrorDefault}
          twClassName="mt-6"
        />
        <Text variant={TextVariant.HeadingLg} twClassName="mt-4">
          {strings(`virtual_bank_account.${variant}.title`)}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings(`virtual_bank_account.${variant}.description`)}
        </Text>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isRetrying}
          isDisabled={isRetrying}
          onPress={handleRetry}
          testID={VbaOnboardingErrorSelectorsIDs.RETRY_BUTTON}
        >
          {strings(`virtual_bank_account.${variant}.button`)}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaOnboardingError;

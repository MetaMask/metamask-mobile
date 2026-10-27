import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import VbaOnboardingError from '../../../KYC/components/OnboardingError';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { buildVbaBaseProperties, trackVbaEvent } from './vbaAnalytics';

export type VbaOnboardingStubVariant = 'account_provisioning_error' | 'error';

export const VbaOnboardingStubSelectorsIDs = {
  CONTAINER: 'vba-onboarding-stub-container',
  BACK_BUTTON: 'vba-onboarding-stub-back-button',
  CONTINUE_BUTTON: 'vba-onboarding-stub-continue-button',
} as const;

interface VbaOnboardingStubProps {
  variant: VbaOnboardingStubVariant;
  onContinue: () => void | Promise<void>;
}

const VbaOnboardingStub = ({ variant, onContinue }: VbaOnboardingStubProps) => {
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    trackVbaEvent(MetaMetricsEvents.MONEY_VBA_ERROR_VIEWED, () =>
      buildVbaBaseProperties({ screenName: `vba_${variant}` }),
    );
  }, [variant]);

  const tw = useTailwind();
  const [isContinuing, setIsContinuing] = useState(false);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(async () => {
    if (isContinuing) {
      return;
    }
    setIsContinuing(true);
    try {
      await onContinue();
    } finally {
      setIsContinuing(false);
    }
  }, [isContinuing, onContinue]);

  if (variant === 'error') {
    return (
      <VbaOnboardingError
        testID={`${VbaOnboardingStubSelectorsIDs.CONTAINER}-${variant}`}
        backButtonTestID={VbaOnboardingStubSelectorsIDs.BACK_BUTTON}
        title={strings('virtual_bank_account.error.title')}
        description={strings('virtual_bank_account.error.description')}
        primaryAction={{
          label: strings('virtual_bank_account.error.button'),
          onPress: onContinue,
          testID: VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON,
        }}
      />
    );
  }

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: VbaOnboardingStubSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={`${VbaOnboardingStubSelectorsIDs.CONTAINER}-${variant}`}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
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
          isLoading={isContinuing}
          isDisabled={isContinuing}
          onPress={handleContinue}
          testID={VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON}
        >
          {strings(`virtual_bank_account.${variant}.button`)}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaOnboardingStub;

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import VbaOnboardingStub from './VbaOnboardingStub';
import {
  navigateToVbaOnboardingDestination,
  resolveVbaOnboarding,
} from './hooks/useVbaOnboardingRouting';

const VBA_LOADING_SOURCE = 'money-add-money-bank-account';

export const VbaOnboardingLoadingSelectorsIDs = {
  CONTAINER: 'vba-onboarding-loading-container',
  BACK_BUTTON: 'vba-onboarding-loading-back-button',
  SPINNER: 'vba-onboarding-loading-spinner',
} as const;

/**
 * Cold-entry screen for VBA onboarding. It is shown before hydrate so the
 * user is not left on the previous screen while status loads. Success
 * replaces this route with the resolved destination. Failure stays here.
 */
const VbaOnboardingLoading = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [attempt, setAttempt] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    let active = true;

    resolveVbaOnboarding(VBA_LOADING_SOURCE).then((resolved) => {
      if (!active) {
        return;
      }
      if (resolved.status === 'error') {
        setHasError(true);
        return;
      }

      Logger.log('[vba-onboarding] resume', {
        source: VBA_LOADING_SOURCE,
        snapshot: resolved.snapshot,
        destinationId: resolved.destinationId,
      });
      navigateToVbaOnboardingDestination(
        navigation,
        resolved.destinationId,
        resolved.snapshot,
      );
    });

    return () => {
      active = false;
    };
  }, [attempt, navigation]);

  if (hasError) {
    return <VbaOnboardingStub variant="error" onContinue={handleRetry} />;
  }

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaOnboardingLoadingSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: VbaOnboardingLoadingSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <Box
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <ActivityIndicator testID={VbaOnboardingLoadingSelectorsIDs.SPINNER} />
      </Box>
    </SafeAreaView>
  );
};

export default VbaOnboardingLoading;

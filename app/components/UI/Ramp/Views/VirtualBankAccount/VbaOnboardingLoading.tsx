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
import type { VbaOnboardingParamList } from './routes';
import { endVbaCufJourney, startVbaCufJourney } from './vbaCufTrace';
import {
  getVbaCufEntrySurfaceForSource,
  VBA_CUF_END_REASON,
} from './vbaCufTags';

const VBA_LOADING_SOURCE = 'money-add-money-bank-account';

interface VbaOnboardingLoadingProps {
  /** Optional so tests can render the screen without a navigator. */
  route?: {
    params?: NonNullable<VbaOnboardingParamList['VbaOnboardingLoading']>;
  };
}

export const VbaOnboardingLoadingSelectorsIDs = {
  CONTAINER: 'vba-onboarding-loading-container',
  BACK_BUTTON: 'vba-onboarding-loading-back-button',
  SPINNER: 'vba-onboarding-loading-spinner',
} as const;

/**
 * Cold-entry screen for VBA onboarding. It is shown before hydrate so the
 * user is not left on the previous screen while status loads. Success
 * replaces this route with the resolved destination. Failure stays here.
 *
 * `source` is the calling surface, used for error telemetry.
 */
const VbaOnboardingLoading = ({ route }: VbaOnboardingLoadingProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const source = route?.params?.source ?? VBA_LOADING_SOURCE;
  const [attempt, setAttempt] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleBack = useCallback(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.BAILED);
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    startVbaCufJourney(getVbaCufEntrySurfaceForSource(source));
    setHasError(false);
    setAttempt((count) => count + 1);
  }, [source]);

  useEffect(() => {
    let active = true;

    resolveVbaOnboarding(source)
      .then((resolved) => {
        if (!active) {
          return;
        }
        if (resolved.status === 'error') {
          setHasError(true);
          return;
        }

        Logger.log('[vba-onboarding] resume', {
          source,
          snapshot: resolved.snapshot,
          destinationId: resolved.destinationId,
        });
        navigateToVbaOnboardingDestination(
          navigation,
          resolved.destinationId,
          resolved.snapshot,
        );
      })
      .catch((error: unknown) => {
        Logger.error(error as Error, {
          tags: { feature: 'vba-onboarding' },
          context: {
            name: 'VbaOnboardingLoading',
            data: { source },
          },
        });
        if (active) {
          setHasError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, navigation, source]);

  useEffect(() => {
    if (hasError) {
      endVbaCufJourney(false, VBA_CUF_END_REASON.ERROR);
    }
  }, [hasError]);

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

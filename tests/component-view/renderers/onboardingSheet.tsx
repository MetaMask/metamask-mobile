import '../mocks';
import React from 'react';
import { FeatureFlagNames } from '../../../app/constants/featureFlags';
import Routes from '../../../app/constants/navigation/Routes';
import OnboardingSheet, {
  type OnboardingSheetProps,
} from '../../../app/components/Views/Onboarding/OnboardingSheet';
import { renderComponentViewScreen } from '../render';
import { initialStateSeedlessOnboarding } from '../presets/seedlessOnboarding';

interface RenderOnboardingSheetOptions {
  addDeviceSyncEnabled?: boolean;
  createWallet?: boolean;
  loadingProvider?: OnboardingSheetProps['loadingProvider'];
  onPressImportFromExtension?: () => void;
  onPressContinueWithTelegram?: OnboardingSheetProps['onPressContinueWithTelegram'];
}

export function renderOnboardingSheet(
  options: RenderOnboardingSheetOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const {
    addDeviceSyncEnabled = false,
    createWallet = false,
    loadingProvider = null,
    onPressImportFromExtension,
    onPressContinueWithTelegram,
  } = options;

  const state = initialStateSeedlessOnboarding()
    .withRemoteFeatureFlags({
      [FeatureFlagNames.addDeviceSyncEnabled]: addDeviceSyncEnabled,
    })
    .build();

  function OnboardingSheetScreen() {
    return (
      <OnboardingSheet
        onDismiss={() => undefined}
        createWallet={createWallet}
        loadingProvider={loadingProvider}
        onPressImportFromExtension={onPressImportFromExtension}
        onPressContinueWithTelegram={onPressContinueWithTelegram}
      />
    );
  }

  return renderComponentViewScreen(
    OnboardingSheetScreen as unknown as React.ComponentType,
    { name: Routes.SHEET.ONBOARDING_SHEET },
    { state },
  );
}

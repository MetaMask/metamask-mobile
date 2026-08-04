import React, { useCallback, useState } from 'react';
import { strings } from '../../../../locales/i18n';
import NewUserSheet from '../../Views/Notifications/PushNotificationOnboarding/NewUserSheet';
import { useCliLoginPushNudge } from './useCliLoginPushNudge';

/**
 * Bridges the non-React CLI QR-login service layer to the push-permission
 * bottom sheet (MMAI-925). Mounted once inside the authenticated Main flow
 * (alongside PushNotificationOnboardingRoot) so the BottomSheet layers above
 * native-stack screens on iOS; a sibling of <AppFlow /> in App.tsx would
 * render behind those screens. Subscribes to the module-level push-nudge
 * signal and shows the shared "Never miss a move" sheet (with CLI-specific
 * copy) when emitted.
 */
const CliLoginPushNudgeListener = () => {
  const { isVisible, onYes, onNotNow, onClose } = useCliLoginPushNudge();
  // Copy-review preview only: make the CLI sheet available immediately after an
  // authenticated development build launches. It never ships in production.
  const [isDevPreviewVisible, setIsDevPreviewVisible] = useState(__DEV__);

  const dismissDevPreview = useCallback(() => {
    setIsDevPreviewVisible(false);
  }, []);

  const handleYes = useCallback(async () => {
    dismissDevPreview();
    await onYes();
  }, [dismissDevPreview, onYes]);

  const handleNotNow = useCallback(() => {
    dismissDevPreview();
    onNotNow();
  }, [dismissDevPreview, onNotNow]);

  const handleClose = useCallback(
    (hasPendingAction?: boolean) => {
      dismissDevPreview();
      onClose(hasPendingAction);
    },
    [dismissDevPreview, onClose],
  );

  return (
    <NewUserSheet
      isVisible={isVisible || isDevPreviewVisible}
      onClose={handleClose}
      onYes={handleYes}
      onNotNow={handleNotNow}
      title={strings('sdk_connect_v2.push_nudge.title')}
      body={strings('sdk_connect_v2.push_nudge.description')}
      yesLabel={strings('sdk_connect_v2.push_nudge.turn_on_button')}
      showPreview={false}
      testID="cli-login-push-nudge"
    />
  );
};

export default CliLoginPushNudgeListener;

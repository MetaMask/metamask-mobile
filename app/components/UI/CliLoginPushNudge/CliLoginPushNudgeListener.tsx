import React from 'react';
import { strings } from '../../../../locales/i18n';
import NewUserSheet from '../../Views/Notifications/PushNotificationOnboarding/NewUserSheet';
import { useCliLoginPushNudge } from './useCliLoginPushNudge';

/**
 * Bridges the non-React CLI QR-login service layer to the push-permission
 * bottom sheet (MMAI-925). Mount once near the app root; subscribes to the
 * module-level push-nudge signal and shows the shared "Never miss a move"
 * sheet (with CLI-specific copy) when emitted.
 */
const CliLoginPushNudgeListener = () => {
  const { isVisible, onYes, onNotNow, onClose } = useCliLoginPushNudge();

  return (
    <NewUserSheet
      isVisible={isVisible}
      onClose={onClose}
      onYes={onYes}
      onNotNow={onNotNow}
      title={strings('sdk_connect_v2.push_nudge.title')}
      body={strings('sdk_connect_v2.push_nudge.description')}
      showPreview={false}
      testID="cli-login-push-nudge"
    />
  );
};

export default CliLoginPushNudgeListener;

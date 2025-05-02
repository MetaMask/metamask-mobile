// Third party dependencies.
import React, { useRef } from 'react';
import { useSelector } from 'react-redux';

// External dependencies.
import { useMetrics } from '../../../hooks/useMetrics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';

import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectIsBackupAndSyncEnabled } from '../../../../selectors/identity';
import { useBackupAndSync } from '../../../../util/identity/hooks/useBackupAndSync';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import ModalContent from '../../Notification/Modal';
import { InteractionManager } from 'react-native';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

const ProfileSyncingModal = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChecked, setIsChecked] = React.useState(false);
  const { setIsBackupAndSyncFeatureEnabled } = useBackupAndSync();

  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  // TODO: Handle errror/loading states from enabling/disabling profile syncing
  const closeBottomSheet = () => {
    bottomSheetRef.current?.onCloseBottomSheet(async () => {
      if (isBackupAndSyncEnabled) {
        InteractionManager.runAfterInteractions(async () => {
          await setIsBackupAndSyncFeatureEnabled(
            BACKUPANDSYNC_FEATURES.main,
            false,
          );
        });
      }
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
          .addProperties({
            settings_group: 'security_privacy',
            settings_type: 'profile_syncing',
            old_value: isBackupAndSyncEnabled,
            new_value: !isBackupAndSyncEnabled,
            was_notifications_on: isMetamaskNotificationsEnabled,
          })
          .build(),
      );
    });
  };

  const handleCta = () => {
    closeBottomSheet();
  };

  const handleCancel = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const turnContent = !isBackupAndSyncEnabled
    ? {
        icon: {
          name: IconName.Check,
          color: IconColor.Success,
        },
        bottomSheetTitle: strings('profile_sync.bottomSheetTurnOn'),
        bottomSheetMessage: strings('profile_sync.enable_description'),
        bottomSheetCTA: strings('default_settings.sheet.buttons.turn_on'),
      }
    : {
        icon: {
          name: IconName.Danger,
          color: IconColor.Error,
        },
        bottomSheetTitle: strings('profile_sync.bottomSheetTurnOff'),
        bottomSheetMessage: strings('profile_sync.disable_warning'),
        bottomSheetCTA: strings('default_settings.sheet.buttons.turn_off'),
      };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <ModalContent
        title={turnContent.bottomSheetTitle}
        message={turnContent.bottomSheetMessage}
        iconName={turnContent.icon.name}
        iconColor={turnContent.icon.color}
        iconSize={IconSize.Xl}
        checkBoxLabel={strings('default_settings.sheet.checkbox_label')}
        btnLabelCancel={strings('default_settings.sheet.buttons.cancel')}
        btnLabelCta={turnContent.bottomSheetCTA}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        hascheckBox={isBackupAndSyncEnabled}
        handleCta={handleCta}
        handleCancel={handleCancel}
      />
    </BottomSheet>
  );
};

export default ProfileSyncingModal;

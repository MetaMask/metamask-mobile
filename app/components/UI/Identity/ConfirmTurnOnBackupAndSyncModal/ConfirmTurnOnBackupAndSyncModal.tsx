import React, { useCallback, useRef, useState } from 'react';

import {
  BottomSheet,
  IconColor,
  IconName,
  IconSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import ModalContent from '../../Notification/Modal';
import { toggleBasicFunctionality } from '../../../../actions/settings';
import { useParams } from '../../../../util/navigation/navUtils';
import { ConfirmTurnOnBackupAndSyncModalNavigateParams } from '../BackupAndSyncToggle/BackupAndSyncToggle';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import useThunkDispatch from '../../../hooks/useThunkDispatch';

const ConfirmTurnOnBackupAndSyncModal = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { enableBackupAndSync, trackEnableBackupAndSyncEvent } =
    useParams<ConfirmTurnOnBackupAndSyncModalNavigateParams>();
  const [isEnabling, setIsEnabling] = useState(false);

  const dispatch = useThunkDispatch();

  // The work runs while this sheet is still up, showing its progress on the CTA.
  // Closing first would slide this sheet out only for the settings screen to
  // slide its loading sheet in behind it.
  const handleEnableBackupAndSync = useCallback(async () => {
    if (isEnabling) {
      return;
    }
    setIsEnabling(true);
    trackEnableBackupAndSyncEvent();

    try {
      await dispatch(toggleBasicFunctionality(true));
      await enableBackupAndSync();
    } finally {
      bottomSheetRef.current?.onCloseBottomSheet();
    }
  }, [
    dispatch,
    enableBackupAndSync,
    isEnabling,
    trackEnableBackupAndSyncEvent,
  ]);

  // Overlay taps, swipe-down and Android back reach the dialog directly instead
  // of going through this handler, so `isInteractable` has to block them.
  const handleCancel = useCallback(() => {
    if (isEnabling) {
      return;
    }
    bottomSheetRef.current?.onCloseBottomSheet();
  }, [isEnabling]);

  const turnContent = {
    icon: {
      name: IconName.Check,
      color: IconColor.SuccessDefault,
    },
    bottomSheetTitle: strings('backupAndSync.enable.title'),
    bottomSheetMessage: strings('backupAndSync.enable.confirmation'),
    bottomSheetCTA: strings('default_settings.sheet.buttons.turn_on'),
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      goBack={navigation.goBack}
      isInteractable={!isEnabling}
    >
      <ModalContent
        title={turnContent.bottomSheetTitle}
        message={turnContent.bottomSheetMessage}
        iconName={turnContent.icon.name}
        iconColor={turnContent.icon.color}
        iconSize={IconSize.Xl}
        checkBoxLabel={strings('default_settings.sheet.checkbox_label')}
        btnLabelCancel={strings('default_settings.sheet.buttons.cancel')}
        btnLabelCta={turnContent.bottomSheetCTA}
        isChecked={false}
        setIsChecked={() => ({})}
        hascheckBox={false}
        handleCta={handleEnableBackupAndSync}
        handleCancel={handleCancel}
        loading={isEnabling}
      />
    </BottomSheet>
  );
};

export default ConfirmTurnOnBackupAndSyncModal;

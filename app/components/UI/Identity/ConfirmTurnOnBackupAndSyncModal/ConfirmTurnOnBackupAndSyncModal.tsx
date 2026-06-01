import React, { useRef } from 'react';

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
import { InteractionManager } from 'react-native';
import useThunkDispatch from '../../../hooks/useThunkDispatch';

import { useElevatedSurface } from '../../../../util/theme/themeUtils';

const ConfirmTurnOnBackupAndSyncModal = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { enableBackupAndSync, trackEnableBackupAndSyncEvent } =
    useParams<ConfirmTurnOnBackupAndSyncModalNavigateParams>();

  const dispatch = useThunkDispatch();
  const surfaceClass = useElevatedSurface();

  const enableBasicFunctionality = async () => {
    await dispatch(toggleBasicFunctionality(true));
  };

  const handleEnableBackupAndSync = () => {
    bottomSheetRef.current?.onCloseBottomSheet(async () => {
      InteractionManager.runAfterInteractions(async () => {
        trackEnableBackupAndSyncEvent();
        await enableBasicFunctionality();
        await enableBackupAndSync();
      });
    });
  };

  const handleCancel = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

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
    <BottomSheet ref={bottomSheetRef} twClassName={surfaceClass}>
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
      />
    </BottomSheet>
  );
};

export default ConfirmTurnOnBackupAndSyncModal;

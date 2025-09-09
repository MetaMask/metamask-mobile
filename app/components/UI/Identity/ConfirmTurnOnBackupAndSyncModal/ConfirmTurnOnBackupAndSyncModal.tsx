import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';

import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import ModalContent from '../../Notification/Modal';
import { toggleBasicFunctionality } from '../../../../actions/settings';
import { InteractionManager } from 'react-native';
import type { RootParamList } from '../../../../util/navigation/types';
import type { StackScreenProps } from '@react-navigation/stack';

type ConfirmTurnOnBackupAndSyncModalProps = StackScreenProps<
  RootParamList,
  'ConfirmTurnOnBackupAndSync'
>;

const ConfirmTurnOnBackupAndSyncModal = ({
  route,
}: ConfirmTurnOnBackupAndSyncModalProps) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { enableBackupAndSync, trackEnableBackupAndSyncEvent } = route.params;

  const dispatch = useDispatch();

  const enableBasicFunctionality = async () => {
    dispatch(toggleBasicFunctionality(true));
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
      color: IconColor.Success,
    },
    bottomSheetTitle: strings('backupAndSync.enable.title'),
    bottomSheetMessage: strings('backupAndSync.enable.confirmation'),
    bottomSheetCTA: strings('default_settings.sheet.buttons.turn_on'),
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

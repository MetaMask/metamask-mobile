import React, { useCallback, useEffect } from 'react';
import Modal from 'react-native-modal';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../../../../../reducers';
import {
  RPCStageTypes,
  iEventGroup,
} from '../../../../../../reducers/rpcEvents';
import { resetEventStage } from '../../../../../../actions/rpcEvents';
import LedgerConfirmationModal from '../../../../../UI/LedgerModals/LedgerConfirmationModal';
import { useStyles } from '../../../../../hooks/useStyles';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useLedgerContext } from '../../../context/ledger-context';
import {
  useHardwareWalletError,
  HardwareWalletType,
} from '../../../../../../core/HardwareWallet';
import styleSheet from './ledger-sign-modal.styles';

const LedgerSignModal = () => {
  console.log('[DEBUG LedgerSignModal] Rendering');
  const dispatch = useDispatch();
  const { styles } = useStyles(styleSheet, {});
  const { signingEvent }: iEventGroup = useSelector(
    (state: RootState) => state.rpcEvents,
  );
  const { closeLedgerSignModal, deviceId } = useLedgerContext();
  console.log('[DEBUG LedgerSignModal] deviceId:', deviceId);
  const { onConfirm, onReject } = useConfirmActions();
  const { parseAndShowError } = useHardwareWalletError();

  const completeRequest = useCallback(() => {
    closeLedgerSignModal();
    dispatch(resetEventStage(signingEvent.rpcName));
  }, [closeLedgerSignModal, dispatch, signingEvent.rpcName]);

  useEffect(() => {
    // Close the modal when the signMessageStage is complete
    if (signingEvent.eventStage === RPCStageTypes.COMPLETE) {
      completeRequest();
    }
    // On error, show the error in the bottom sheet before closing
    if (signingEvent.eventStage === RPCStageTypes.ERROR) {
      if (signingEvent.error) {
        parseAndShowError(signingEvent.error, HardwareWalletType.Ledger);
      }
      completeRequest();
    }
  }, [
    signingEvent.eventStage,
    signingEvent.error,
    completeRequest,
    parseAndShowError,
  ]);

  const onConfirmation = useCallback(async () => {
    console.log('[DEBUG LedgerSignModal] onConfirmation called');

    try {
      // Note: Device status check happens inside useLedgerBluetooth via connectLedgerHardware
      // If the device is locked, it will timeout and show an error via the ledgerError state
      await onConfirm();
      console.log('[DEBUG LedgerSignModal] onConfirm completed successfully');
    } catch (err) {
      console.log('[DEBUG LedgerSignModal] Error:', err);
      // Show error in centralized bottom sheet
      parseAndShowError(err, HardwareWalletType.Ledger);
      onReject();
    }
  }, [onConfirm, onReject, parseAndShowError]);

  const onRejection = useCallback(() => {
    console.log('[DEBUG LedgerSignModal] onRejection called - closing modal');
    onReject();
    completeRequest();
  }, [completeRequest, onReject]);

  if (!deviceId) {
    return null;
  }

  return (
    <Modal isVisible style={styles.modal}>
      <View style={styles.contentWrapper}>
        <LedgerConfirmationModal
          onConfirmation={onConfirmation}
          onRejection={onRejection}
          deviceId={deviceId}
        />
      </View>
    </Modal>
  );
};

export default LedgerSignModal;

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
import { useHardwareWalletSigningContext } from '../../../context/hardware-wallet-signing-context';
import styleSheet from './ledger-sign-modal.styles';
import Logger from '../../../../../../util/Logger';

const LedgerSignModal = () => {
  const dispatch = useDispatch();
  const { styles } = useStyles(styleSheet, {});
  const { signingEvent }: iEventGroup = useSelector(
    (state: RootState) => state.rpcEvents,
  );
  const { closeSignModal, deviceId } = useHardwareWalletSigningContext();
  const { onConfirm, onReject } = useConfirmActions();

  // Debug logging
  useEffect(() => {
    Logger.log('[LedgerSignModal] signingEvent changed:', {
      eventStage: signingEvent.eventStage,
      rpcName: signingEvent.rpcName,
      error: signingEvent.error,
    });
  }, [signingEvent]);

  useEffect(() => {
    Logger.log('[LedgerSignModal] deviceId changed:', deviceId);
  }, [deviceId]);

  const completeRequest = useCallback(() => {
    Logger.log('[LedgerSignModal] completeRequest called');
    closeSignModal();
    dispatch(resetEventStage(signingEvent.rpcName));
  }, [closeSignModal, dispatch, signingEvent.rpcName]);

  useEffect(() => {
    //Close the modal when the signMessageStage is complete or error, error will return the error message to the user
    if (
      signingEvent.eventStage === RPCStageTypes.COMPLETE ||
      signingEvent.eventStage === RPCStageTypes.ERROR
    ) {
      Logger.log(
        '[LedgerSignModal] Closing modal due to eventStage:',
        signingEvent.eventStage,
      );
      completeRequest();
    }
  }, [signingEvent.eventStage, completeRequest]);

  const onConfirmation = useCallback(async () => {
    Logger.log('[LedgerSignModal] onConfirmation called, calling onConfirm...');
    try {
      await onConfirm();
      Logger.log('[LedgerSignModal] onConfirm completed successfully');
    } catch (err) {
      Logger.error(err as Error, '[LedgerSignModal] onConfirm error');
      onReject();
    }
  }, [onConfirm, onReject]);

  const onRejection = useCallback(() => {
    Logger.log('[LedgerSignModal] onRejection called');
    onReject();
    completeRequest();
  }, [completeRequest, onReject]);

  if (!deviceId) {
    Logger.log('[LedgerSignModal] No deviceId, returning null');
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

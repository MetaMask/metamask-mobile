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
import styleSheet from './ledger-sign-modal.styles';

const LedgerSignModal = () => {
  const dispatch = useDispatch();
  const { styles } = useStyles(styleSheet, {});
  const { signingEvent }: iEventGroup = useSelector(
    (state: RootState) => state.rpcEvents,
  );
  const { closeLedgerSignModal, deviceId } = useLedgerContext();
  const { onConfirm, onReject } = useConfirmActions();

  const completeRequest = useCallback(() => {
    closeLedgerSignModal();
    dispatch(resetEventStage(signingEvent.rpcName));
  }, [closeLedgerSignModal, dispatch, signingEvent.rpcName]);

  useEffect(() => {
    //Close the modal when the signMessageStage is complete or error, error will return the error message to the user
    if (
      signingEvent.eventStage === RPCStageTypes.COMPLETE ||
      signingEvent.eventStage === RPCStageTypes.ERROR
    ) {
      completeRequest();
    }
  }, [signingEvent.eventStage, completeRequest]);

  const onConfirmation = useCallback(async () => {
    try {
      await onConfirm();
    } catch (err) {
      onReject();
    }
  }, [onConfirm, onReject]);

  const onRejection = useCallback(() => {
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

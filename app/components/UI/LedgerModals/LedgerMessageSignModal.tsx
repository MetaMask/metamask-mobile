import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { closeLedgerSignModal } from '../../../actions/modals';
import LedgerConfirmationModal from './LedgerConfirmationModal';

const LedgerMessageSignModal = () => {
  const dispatch = useDispatch();
  const {
    messageParams,
    onConfirmationComplete = () => null,
    version,
    type,
    deviceId,
  } = useSelector((state: any) => state.modals.ledgerSignMessageActionParams);
  const { KeyringController } = Engine.context as any;

  const executeOnLedger = useCallback(async () => {
    // This requires the user to confirm on the ledger device
    let rawSignature;

    if (type === 'signMessage') {
      rawSignature = await KeyringController.signMessage(messageParams);
    }

    if (type === 'signPersonalMessage') {
      rawSignature = await KeyringController.signPersonalMessage(messageParams);
    }

    if (type === 'signTypedMessage') {
      rawSignature = await KeyringController.signTypedMessage(
        messageParams,
        version,
      );
    }

    onConfirmationComplete(true, rawSignature);
    dispatch(closeLedgerSignModal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRejection = useCallback(() => {
    onConfirmationComplete(false);
    dispatch(closeLedgerSignModal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LedgerConfirmationModal
      onConfirmation={executeOnLedger}
      onRejection={onRejection}
      deviceId={deviceId}
    />
  );
};

export default React.memo(LedgerMessageSignModal);

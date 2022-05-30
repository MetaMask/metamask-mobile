import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { closeLedgerTransactionModal } from '../../../actions/modals';
import LedgerConfirmationModal from './LedgerConfirmationModal';

const LedgerTransactionModal = () => {
  const dispatch = useDispatch();
  const {
    transactionId,
    onConfirmationComplete = () => null,
    deviceId,
  } = useSelector((state: any) => state.modals.ledgerTransactionActionParams);
  const { TransactionController } = Engine.context as any;

  const executeOnLedger = useCallback(async () => {
    // This requires the user to confirm on the ledger device
    await TransactionController.approveTransaction(transactionId);

    onConfirmationComplete(true);
    dispatch(closeLedgerTransactionModal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRejection = useCallback(() => {
    onConfirmationComplete(false);
    dispatch(closeLedgerTransactionModal());
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

export default React.memo(LedgerTransactionModal);

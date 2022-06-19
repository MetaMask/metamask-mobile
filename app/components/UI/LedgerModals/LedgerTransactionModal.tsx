import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import Engine from '../../../core/Engine';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { createStyles } from './styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';

export const createLedgerTransactionModalNavDetails =
  createNavigationDetails<LedgerTransactionModalParams>(
    Routes.LEDGER_TRANSACTION_MODAL,
  );

export interface LedgerTransactionModalParams {
  onConfirmationComplete: (confirmed: boolean) => void;
  transactionId: string;
  deviceId: string;
}

const LedgerTransactionModal = () => {
  const modalRef = useRef<ReusableModalRef | null>(null);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);
  const { TransactionController } = Engine.context as any;

  const { transactionId, onConfirmationComplete, deviceId } =
    useParams<LedgerTransactionModalParams>();

  const dismissModal = useCallback(() => modalRef?.current?.dismissModal(), []);

  const executeOnLedger = useCallback(async () => {
    // This requires the user to confirm on the ledger device
    try {
      await TransactionController.approveTransaction(transactionId);
    } catch (e) {
      throw e;
    }

    onConfirmationComplete(true);
    dismissModal();
  }, [onConfirmationComplete, dismissModal]);

  const onRejection = useCallback(() => {
    onConfirmationComplete(false);
    dismissModal();
  }, [onConfirmationComplete, dismissModal]);

  return (
    <ReusableModal ref={modalRef} style={styles.modal}>
      <View style={styles.contentWrapper}>
        <LedgerConfirmationModal
          onConfirmation={executeOnLedger}
          onRejection={onRejection}
          deviceId={deviceId}
        />
      </View>
    </ReusableModal>
  );
};

export default React.memo(LedgerTransactionModal);

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

export enum LedgerReplacementTxTypes {
  SPEED_UP = 'speedUp',
  CANCEL = 'cancel',
}

export interface ReplacementTxParams {
  type: LedgerReplacementTxTypes;
  eip1559GasFee?: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export interface LedgerTransactionModalParams {
  onConfirmationComplete: (confirmed: boolean) => void;
  transactionId: string;
  deviceId: string;
  replacementParams?: ReplacementTxParams;
}

const LedgerTransactionModal = () => {
  const modalRef = useRef<ReusableModalRef | null>(null);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);
  const { TransactionController, ApprovalController } = Engine.context as any;

  const { transactionId, onConfirmationComplete, deviceId, replacementParams } =
    useParams<LedgerTransactionModalParams>();

  const dismissModal = useCallback(() => modalRef?.current?.dismissModal(), []);

  const executeOnLedger = useCallback(async () => {
    if (replacementParams?.type === LedgerReplacementTxTypes.SPEED_UP) {
      await TransactionController.speedUpTransaction(
        transactionId,
        replacementParams.eip1559GasFee,
      );
    } else if (replacementParams?.type === LedgerReplacementTxTypes.CANCEL) {
      await TransactionController.stopTransaction(
        transactionId,
        replacementParams.eip1559GasFee,
      );
    } else {
      // This requires the user to confirm on the ledger device
      await ApprovalController.accept(transactionId, undefined, {
        waitForResult: true,
      });
    }

    await onConfirmationComplete(true);
    dismissModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

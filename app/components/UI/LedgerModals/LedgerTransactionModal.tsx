import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import Engine from '../../../core/Engine';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { createStyles } from './styles';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import { speedUpTransaction } from '../../../util/transaction-controller';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation';
import { LedgerReplacementTxTypes } from './LedgerTransactionModal.types';

type LedgerTransactionModalProps = StackScreenProps<
  RootParamList,
  'LedgerTransactionModal'
>;

const LedgerTransactionModal = ({ route }: LedgerTransactionModalProps) => {
  const modalRef = useRef<ReusableModalRef | null>(null);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { TransactionController, ApprovalController } = Engine.context as any;

  const { transactionId, onConfirmationComplete, deviceId, replacementParams } =
    route.params;

  const dismissModal = useCallback(() => modalRef?.current?.dismissModal(), []);

  const executeOnLedger = useCallback(async () => {
    if (replacementParams?.type === LedgerReplacementTxTypes.SPEED_UP) {
      //@ts-expect-error Will defer this typescript issue to the hardware wallet team, confirmations or transactions team
      await speedUpTransaction(transactionId, replacementParams.eip1559GasFee);
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

    onConfirmationComplete(true);
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

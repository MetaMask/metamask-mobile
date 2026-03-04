import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../core/Engine';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { speedUpTransaction } from '../../../util/transaction-controller';

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
  legacyGasFee?: {
    gasPrice?: string;
  };
}

export interface LedgerTransactionModalParams {
  onConfirmationComplete: (confirmed: boolean) => void;
  transactionId: string;
  deviceId: string;
  replacementParams?: ReplacementTxParams;
}

const LedgerTransactionModal = () => {
  const navigation = useNavigation();
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { TransactionController, ApprovalController } = Engine.context as any;

  const { transactionId, onConfirmationComplete, deviceId, replacementParams } =
    useParams<LedgerTransactionModalParams>();

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const executeOnLedger = useCallback(async () => {
    const gasFeeParams =
      replacementParams?.legacyGasFee ?? replacementParams?.eip1559GasFee;

    if (replacementParams?.type === LedgerReplacementTxTypes.SPEED_UP) {
      //@ts-expect-error Will defer this typescript issue to the hardware wallet team, confirmations or transactions team
      await speedUpTransaction(transactionId, gasFeeParams);
    } else if (replacementParams?.type === LedgerReplacementTxTypes.CANCEL) {
      await TransactionController.stopTransaction(transactionId, gasFeeParams);
    } else {
      // This requires the user to confirm on the ledger device
      await ApprovalController.accept(transactionId, undefined, {
        waitForResult: true,
      });
    }

    onConfirmationComplete(true);
    goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onConfirmationComplete, goBack]);

  const onRejection = useCallback(() => {
    onConfirmationComplete(false);
    goBack();
  }, [onConfirmationComplete, goBack]);

  return (
    <LedgerConfirmationModal
      onConfirmation={executeOnLedger}
      onRejection={onRejection}
      deviceId={deviceId}
    />
  );
};

export default React.memo(LedgerTransactionModal);

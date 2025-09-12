/* eslint-disable @typescript-eslint/no-explicit-any */
import { providerErrors } from '@metamask/rpc-errors';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { getDeviceId } from '../../../core/Ledger/Ledger';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { decGWEIToHexWEI } from '../../../util/conversions';
import { addHexPrefix } from '../../../util/number';
import { speedUpTransaction as speedUpTx } from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { createLedgerTransactionModalNavDetails } from '../../UI/LedgerModals/LedgerTransactionModal';

type Maybe<T> = T | null | undefined;

export function useUnifiedTxActions() {
  const navigation = useNavigation<any>();

  const gasFeeEstimates = useSelector(selectGasFeeEstimates);
  const accounts = useSelector(selectAccounts);

  const [retryIsOpen, setRetryIsOpen] = useState(false);
  const [retryErrorMsg, setRetryErrorMsg] = useState<string | undefined>(
    undefined,
  );
  const [speedUpIsOpen, setSpeedUpIsOpen] = useState(false);
  const [cancelIsOpen, setCancelIsOpen] = useState(false);
  const [speedUp1559IsOpen, setSpeedUp1559IsOpen] = useState(false);
  const [cancel1559IsOpen, setCancel1559IsOpen] = useState(false);
  const [speedUpConfirmDisabled, setSpeedUpConfirmDisabled] = useState(false);
  const [cancelConfirmDisabled, setCancelConfirmDisabled] = useState(false);
  const [existingGas, setExistingGas] = useState<any>(null);
  const [existingTx, setExistingTx] = useState<any>(null);
  const [speedUpTxId, setSpeedUpTxId] = useState<Maybe<string>>(null);
  const [cancelTxId, setCancelTxId] = useState<Maybe<string>>(null);

  const toggleRetry = (msg?: string) => {
    setRetryIsOpen((prev) => !prev);
    setRetryErrorMsg(msg);
  };

  const getGasPriceEstimate = () => {
    const estimateGweiDecimalRaw =
      (gasFeeEstimates as any)?.medium?.suggestedMaxFeePerGas ??
      (gasFeeEstimates as any)?.medium ??
      (gasFeeEstimates as any)?.gasPrice ??
      '0';
    return addHexPrefix(
      (decGWEIToHexWEI as any)(String(estimateGweiDecimalRaw)),
    );
  };

  const getCancelOrSpeedupValues = (transactionObject?: any) => {
    const { suggestedMaxFeePerGasHex, suggestedMaxPriorityFeePerGasHex } =
      transactionObject ?? {};

    if (suggestedMaxFeePerGasHex) {
      return {
        maxFeePerGas: `0x${suggestedMaxFeePerGasHex}`,
        maxPriorityFeePerGas: `0x${suggestedMaxPriorityFeePerGasHex}`,
      };
    }
    if (existingGas?.gasPrice !== 0) {
      // Transaction controller will multiply existing gas price by the rate.
      return undefined;
    }
    return { gasPrice: getGasPriceEstimate() };
  };

  const onSpeedUpAction = (open: boolean, nextExistingGas?: any, tx?: any) => {
    if (!open) {
      setSpeedUpIsOpen(false);
      setSpeedUp1559IsOpen(false);
      return;
    }
    setExistingGas(nextExistingGas);
    setExistingTx(tx);
    setSpeedUpTxId(tx?.id ?? null);
    if (nextExistingGas?.isEIP1559Transaction) {
      setSpeedUp1559IsOpen(true);
    } else {
      const disabled = Boolean(
        validateTransactionActionBalance(tx, '1.1', accounts as any),
      );
      setSpeedUpConfirmDisabled(disabled);
      setSpeedUpIsOpen(true);
    }
  };

  const onCancelAction = (open: boolean, nextExistingGas?: any, tx?: any) => {
    if (!open) {
      setCancelIsOpen(false);
      setCancel1559IsOpen(false);
      return;
    }
    setExistingGas(nextExistingGas);
    setExistingTx(tx);
    setCancelTxId(tx?.id ?? null);
    if (nextExistingGas?.isEIP1559Transaction) {
      setCancel1559IsOpen(true);
    } else {
      const disabled = Boolean(
        validateTransactionActionBalance(tx, '1.1', accounts as any),
      );
      setCancelConfirmDisabled(disabled);
      setCancelIsOpen(true);
    }
  };

  const onSpeedUpCompleted = () => {
    setSpeedUp1559IsOpen(false);
    setSpeedUpIsOpen(false);
    setExistingGas(null);
    setSpeedUpTxId(null);
    setExistingTx(null);
  };

  const onCancelCompleted = () => {
    setCancel1559IsOpen(false);
    setCancelIsOpen(false);
    setExistingGas(null);
    setCancelTxId(null);
    setExistingTx(null);
  };

  const speedUpTransaction = async (transactionObject?: any) => {
    try {
      if (transactionObject?.error) {
        throw new Error(transactionObject.error);
      }
      await speedUpTx(
        speedUpTxId as string,
        getCancelOrSpeedupValues(transactionObject),
      );
      onSpeedUpCompleted();
    } catch (e: any) {
      toggleRetry(e?.message);
      setSpeedUp1559IsOpen(false);
      setSpeedUpIsOpen(false);
    }
  };

  const cancelTransaction = async (transactionObject?: any) => {
    try {
      if (transactionObject?.error) {
        throw new Error(transactionObject.error);
      }
      await (Engine.context as any).TransactionController.stopTransaction(
        cancelTxId as string,
        getCancelOrSpeedupValues(transactionObject),
      );
      onCancelCompleted();
    } catch (e: any) {
      toggleRetry(e?.message);
      setCancel1559IsOpen(false);
      setCancelIsOpen(false);
    }
  };

  const signQRTransaction = async (tx: any) => {
    const { KeyringController, ApprovalController } = Engine.context as any;
    await KeyringController.resetQRKeyringState();
    await ApprovalController.accept(tx.id, undefined, { waitForResult: true });
  };

  const signLedgerTransaction = async (transaction: any) => {
    const deviceId = await getDeviceId();
    const onConfirmation = (isComplete: boolean) => {
      if (isComplete) {
        transaction.speedUpParams &&
        transaction.speedUpParams?.type === 'SpeedUp'
          ? onSpeedUpCompleted()
          : onCancelCompleted();
      }
    };
    navigation.navigate(
      ...createLedgerTransactionModalNavDetails({
        transactionId: transaction.id,
        deviceId,
        onConfirmationComplete: onConfirmation,
        replacementParams: transaction?.replacementParams,
      }),
    );
  };

  const cancelUnsignedQRTransaction = async (tx: any) => {
    await (Engine.context as any).ApprovalController.reject(
      tx.id,
      providerErrors.userRejectedRequest(),
    );
  };

  return {
    retryIsOpen,
    retryErrorMsg,
    speedUpIsOpen,
    cancelIsOpen,
    speedUp1559IsOpen,
    cancel1559IsOpen,
    speedUpConfirmDisabled,
    cancelConfirmDisabled,
    existingGas,
    existingTx,
    speedUpTxId,
    cancelTxId,
    toggleRetry,
    onSpeedUpAction,
    onCancelAction,
    onSpeedUpCompleted,
    onCancelCompleted,
    speedUpTransaction,
    cancelTransaction,
    signQRTransaction,
    signLedgerTransaction,
    cancelUnsignedQRTransaction,
  } as const;
}

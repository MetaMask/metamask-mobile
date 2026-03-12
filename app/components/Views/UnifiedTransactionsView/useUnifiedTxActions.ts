import { providerErrors } from '@metamask/rpc-errors';
import {
  CANCEL_RATE,
  SPEED_UP_RATE,
  type FeeMarketEIP1559Values,
  type GasPriceValue,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Engine from '../../../core/Engine';
import { getDeviceId } from '../../../core/Ledger/Ledger';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { isHardwareAccount } from '../../../util/address';
import { getMediumGasPriceHex } from '../../../util/confirmation/gas';
import { speedUpTransaction as speedUpTx } from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import {
  createLedgerTransactionModalNavDetails,
  LedgerReplacementTxTypes,
  type ReplacementTxParams,
} from '../../UI/LedgerModals/LedgerTransactionModal';
import { createQRSigningTransactionModalNavDetails } from '../../UI/QRHardware/QRSigningTransactionModal';

type Maybe<T> = T | null | undefined;

export interface LegacyExistingGas {
  isEIP1559Transaction?: false;
  gasPrice?: string | number;
}

export interface Eip1559ExistingGas {
  isEIP1559Transaction: true;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export type ExistingGas = LegacyExistingGas | Eip1559ExistingGas;

/** Params for speed-up/cancel: controller shape only; optional error for UI flow */
export type SpeedUpCancelParams = (GasPriceValue | FeeMarketEIP1559Values) & {
  error?: string;
};

interface LedgerSignRequest {
  id: string;
  replacementParams?: ReplacementTxParams;
  speedUpParams?: {
    type?: string;
  };
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : undefined;

export const SpeedUpCancelModalState = {
  Closed: 'closed',
  SpeedUp: 'speedUp',
  Cancel: 'cancel',
} as const;

export type SpeedUpCancelModalState =
  (typeof SpeedUpCancelModalState)[keyof typeof SpeedUpCancelModalState];

export function useUnifiedTxActions() {
  const navigation = useNavigation();

  const gasFeeEstimates = useSelector(selectGasFeeEstimates);
  const accounts = useSelector(selectAccounts);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const [retryIsOpen, setRetryIsOpen] = useState(false);
  const [retryErrorMsg, setRetryErrorMsg] = useState<string | undefined>(
    undefined,
  );
  const [speedUpCancelModalState, setSpeedUpCancelModalState] =
    useState<SpeedUpCancelModalState>(SpeedUpCancelModalState.Closed);
  const [confirmDisabled, setConfirmDisabled] = useState(false);
  const [existingTx, setExistingTx] = useState<TransactionMeta | null>(null);
  const [speedUpTxId, setSpeedUpTxId] = useState<Maybe<string>>(null);
  const [cancelTxId, setCancelTxId] = useState<Maybe<string>>(null);

  const isLedgerAccount = isHardwareAccount(selectedAddress ?? '', [
    ExtendedKeyringTypes.ledger,
  ]);

  const toggleRetry = (msg?: string) => {
    setRetryIsOpen((prev) => !prev);
    setRetryErrorMsg(msg);
  };

  const closeSpeedUpCancelModal = useCallback(() => {
    setSpeedUpCancelModalState(SpeedUpCancelModalState.Closed);
    setSpeedUpTxId(null);
    setCancelTxId(null);
    setExistingTx(null);
  }, []);

  const onSpeedUpCancelCompleted = useCallback(() => {
    closeSpeedUpCancelModal();
  }, [closeSpeedUpCancelModal]);

  const signLedgerTransaction = useCallback(
    async (transaction: LedgerSignRequest) => {
      const deviceId = await getDeviceId();
      const onConfirmation = (_isComplete: boolean) => {
        // Clean up modal state regardless of whether the user confirmed or rejected.
        // Without this, rejecting on the Ledger modal leaves stale state that can
        // cause the speed up/cancel modal to reappear unexpectedly.
        onSpeedUpCancelCompleted();
      };
      navigation.navigate(
        ...createLedgerTransactionModalNavDetails({
          transactionId: transaction.id,
          deviceId,
          onConfirmationComplete: onConfirmation,
          replacementParams: transaction?.replacementParams,
        }),
      );
    },
    [navigation, onSpeedUpCancelCompleted],
  );

  const getGasPriceEstimate = () => getMediumGasPriceHex(gasFeeEstimates);

  const getCancelOrSpeedupValues = ():
    | GasPriceValue
    | FeeMarketEIP1559Values
    | undefined => {
    const txParams = existingTx?.txParams;
    const existingGasPriceHex = txParams?.gasPrice;
    if (existingGasPriceHex !== undefined && existingGasPriceHex !== '0x0') {
      const existingGasPriceDecimal = parseInt(String(existingGasPriceHex), 16);
      if (existingGasPriceDecimal !== 0) {
        return undefined;
      }
    }
    return { gasPrice: getGasPriceEstimate() };
  };

  const onSpeedUpAction = (open: boolean, tx?: TransactionMeta) => {
    if (!open) {
      setSpeedUpCancelModalState(SpeedUpCancelModalState.Closed);
      return;
    }
    if (!tx) {
      return;
    }
    setExistingTx(tx);
    setSpeedUpTxId(tx.id ?? null);
    setConfirmDisabled(
      Boolean(
        validateTransactionActionBalance(
          tx,
          SPEED_UP_RATE.toString(),
          accounts,
        ),
      ),
    );
    setSpeedUpCancelModalState(SpeedUpCancelModalState.SpeedUp);
  };

  const onCancelAction = (open: boolean, tx?: TransactionMeta) => {
    if (!open) {
      setSpeedUpCancelModalState(SpeedUpCancelModalState.Closed);
      return;
    }
    if (!tx) {
      return;
    }
    setExistingTx(tx);
    setCancelTxId(tx.id ?? null);
    setConfirmDisabled(
      Boolean(
        validateTransactionActionBalance(tx, CANCEL_RATE.toString(), accounts),
      ),
    );
    setSpeedUpCancelModalState(SpeedUpCancelModalState.Cancel);
  };

  const getParamsToSend = (
    params?: SpeedUpCancelParams,
  ): GasPriceValue | FeeMarketEIP1559Values | undefined => {
    if (params?.error) {
      return undefined;
    }
    if (
      params &&
      'gasPrice' in params &&
      (params.gasPrice === '0x0' || parseInt(String(params.gasPrice), 16) === 0)
    ) {
      return getCancelOrSpeedupValues();
    }
    if (params && ('maxFeePerGas' in params || 'gasPrice' in params)) {
      return params;
    }
    return getCancelOrSpeedupValues();
  };

  const speedUpTransaction = async (params?: SpeedUpCancelParams) => {
    try {
      if (params && 'error' in params && params.error) {
        throw new Error(params.error);
      }
      if (!speedUpTxId) {
        throw new Error('Missing transaction id for speed up');
      }

      const gasValues = getParamsToSend(params);

      if (isLedgerAccount) {
        const isEip1559 = gasValues && 'maxFeePerGas' in gasValues;

        await signLedgerTransaction({
          id: speedUpTxId,
          speedUpParams: { type: 'SpeedUp' },
          replacementParams: {
            type: LedgerReplacementTxTypes.SPEED_UP,
            ...(isEip1559
              ? { eip1559GasFee: gasValues }
              : { legacyGasFee: gasValues }),
          },
        });
        return;
      }

      await speedUpTx(speedUpTxId, getParamsToSend(params));
      onSpeedUpCancelCompleted();
    } catch (error: unknown) {
      toggleRetry(getErrorMessage(error));
      setSpeedUpCancelModalState(SpeedUpCancelModalState.Closed);
    }
  };

  const cancelTransaction = async (params?: SpeedUpCancelParams) => {
    try {
      if (params && 'error' in params && params.error) {
        throw new Error(params.error);
      }
      if (!cancelTxId) {
        throw new Error('Missing transaction id for cancel');
      }

      const gasValues = getParamsToSend(params);

      if (isLedgerAccount) {
        const isEip1559 = gasValues && 'maxFeePerGas' in gasValues;

        await signLedgerTransaction({
          id: cancelTxId,
          replacementParams: {
            type: LedgerReplacementTxTypes.CANCEL,
            ...(isEip1559
              ? { eip1559GasFee: gasValues }
              : { legacyGasFee: gasValues }),
          },
        });
        return;
      }

      await Engine.context.TransactionController.stopTransaction(
        cancelTxId,
        gasValues,
      );
      onSpeedUpCancelCompleted();
    } catch (error: unknown) {
      toggleRetry(getErrorMessage(error));
      setSpeedUpCancelModalState(SpeedUpCancelModalState.Closed);
    }
  };

  const signQRTransaction = useCallback(
    async (transactionMeta: TransactionMeta) => {
      navigation.navigate(
        ...createQRSigningTransactionModalNavDetails({
          transactionId: transactionMeta.id,
          onConfirmationComplete: () => {
            // Modal handles confirmation/rejection internally
          },
        }),
      );
    },
    [navigation],
  );

  const cancelUnsignedQRTransaction = async (tx: TransactionMeta) => {
    await Engine.context.ApprovalController.reject(
      tx.id,
      providerErrors.userRejectedRequest(),
    );
  };

  return {
    retryIsOpen,
    retryErrorMsg,
    speedUpIsOpen: speedUpCancelModalState === SpeedUpCancelModalState.SpeedUp,
    cancelIsOpen: speedUpCancelModalState === SpeedUpCancelModalState.Cancel,
    confirmDisabled,
    existingTx,
    speedUpTxId,
    cancelTxId,
    toggleRetry,
    onSpeedUpAction,
    onCancelAction,
    onSpeedUpCancelCompleted,
    speedUpTransaction,
    cancelTransaction,
    signQRTransaction,
    signLedgerTransaction,
    cancelUnsignedQRTransaction,
  } as const;
}

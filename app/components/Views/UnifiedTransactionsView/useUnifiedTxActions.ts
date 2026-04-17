import { providerErrors } from '@metamask/rpc-errors';
import {
  CANCEL_RATE,
  SPEED_UP_RATE,
  type FeeMarketEIP1559Values,
  type GasPriceValue,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import { ToastContext } from '../../../component-library/components/Toast';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Engine from '../../../core/Engine';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { isHardwareAccount } from '../../../util/address';
import {
  getGasValuesForReplacement,
  getMediumGasPriceHex,
  normalizeReplacementGasFeeParams,
} from '../../../util/confirmation/gas';
import {
  getPreviousGasFromController,
  speedUpTransaction as speedUpTx,
} from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { LedgerReplacementTxTypes } from '../../UI/LedgerModals/LedgerTransactionModal';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { createQRSigningTransactionModalNavDetails } from '../../UI/QRHardware/QRSigningTransactionModal';
import {
  useHardwareWallet,
  executeHardwareWalletOperation,
} from '../../../core/HardwareWallet';
import {
  getReplacementGasFeeParams,
  type ReplacementTxParams,
} from '../../../core/HardwareWallet/transactionReplacementParams';
import { getTransactionUpdateErrorToastOptions } from '../../../util/confirmation/transactions';

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

export const SpeedUpCancelModalState = {
  Closed: 'closed',
  SpeedUp: 'speedUp',
  Cancel: 'cancel',
} as const;

export type SpeedUpCancelModalState =
  (typeof SpeedUpCancelModalState)[keyof typeof SpeedUpCancelModalState];

export function useUnifiedTxActions() {
  const navigation = useNavigation();
  const {
    ensureDeviceReady,
    setTargetWalletType,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();
  const toastContext = useContext(ToastContext);
  const toastRef = toastContext?.toastRef;

  const gasFeeEstimates = useSelector(selectGasFeeEstimates);
  const accounts = useSelector(selectAccounts);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
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

  const showTransactionUpdateErrorToast = useCallback(
    (error: unknown) => {
      toastRef?.current?.showToast(
        getTransactionUpdateErrorToastOptions(error),
      );
    },
    [toastRef],
  );

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
      if (!selectedAddress) {
        throw new Error(
          'Missing selected address for hardware wallet operation',
        );
      }

      const gasFeeParams = normalizeReplacementGasFeeParams(
        transaction?.replacementParams,
      );

      const didComplete = await executeHardwareWalletOperation({
        address: selectedAddress,
        operationType: 'transaction',
        ensureDeviceReady,
        setTargetWalletType,
        showAwaitingConfirmation,
        hideAwaitingConfirmation,
        showHardwareWalletError,
        execute: async () => {
          if (
            transaction?.replacementParams?.type ===
            LedgerReplacementTxTypes.SPEED_UP
          ) {
            await speedUpTx(transaction.id, gasFeeParams);
            return;
          }

          if (
            transaction?.replacementParams?.type ===
            LedgerReplacementTxTypes.CANCEL
          ) {
            await Engine.context.TransactionController.stopTransaction(
              transaction.id,
              gasFeeParams,
            );
            return;
          }

          await Engine.context.ApprovalController.acceptRequest(
            transaction.id,
            undefined,
            {
              waitForResult: true,
            },
          );
        },
        onRejected: onSpeedUpCancelCompleted,
      });

      if (didComplete) {
        onSpeedUpCancelCompleted();
      }
    },
    [
      selectedAddress,
      ensureDeviceReady,
      setTargetWalletType,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
      showHardwareWalletError,
      onSpeedUpCancelCompleted,
    ],
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

      const rawGasValues = getParamsToSend(params);
      const gasValues = getGasValuesForReplacement(
        rawGasValues,
        getPreviousGasFromController(speedUpTxId),
        SPEED_UP_RATE,
      );

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

      await speedUpTx(speedUpTxId, gasValues);
      onSpeedUpCancelCompleted();
    } catch (error: unknown) {
      showTransactionUpdateErrorToast(error);
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

      const rawGasValues = getParamsToSend(params);
      const gasValues = getGasValuesForReplacement(
        rawGasValues,
        getPreviousGasFromController(cancelTxId),
        CANCEL_RATE,
      );

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
      showTransactionUpdateErrorToast(error);
      setSpeedUpCancelModalState(SpeedUpCancelModalState.Closed);
    }
  };

  const signQRTransaction = useCallback(
    async (transactionMeta: TransactionMeta) => {
      if (!selectedAddress) {
        throw new Error(
          'Missing selected address for QR hardware wallet operation',
        );
      }

      await executeHardwareWalletOperation({
        address: selectedAddress,
        operationType: 'transaction',
        ensureDeviceReady,
        setTargetWalletType,
        showAwaitingConfirmation,
        hideAwaitingConfirmation,
        showHardwareWalletError,
        execute: async () => {
          await new Promise<void>((resolve, reject) => {
            navigation.navigate(
              ...createQRSigningTransactionModalNavDetails({
                transactionId: transactionMeta.id,
                onConfirmationComplete: (confirmed) => {
                  if (confirmed) {
                    resolve();
                  } else {
                    reject(new Error(KEYSTONE_TX_CANCELED));
                  }
                },
              }),
            );
          });
        },
        onRejected: onSpeedUpCancelCompleted,
      });
    },
    [
      selectedAddress,
      navigation,
      ensureDeviceReady,
      setTargetWalletType,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
      showHardwareWalletError,
      onSpeedUpCancelCompleted,
    ],
  );

  const cancelUnsignedQRTransaction = async (tx: TransactionMeta) => {
    await Engine.context.ApprovalController.rejectRequest(
      tx.id,
      providerErrors.userRejectedRequest(),
    );
  };

  return {
    speedUpIsOpen: speedUpCancelModalState === SpeedUpCancelModalState.SpeedUp,
    cancelIsOpen: speedUpCancelModalState === SpeedUpCancelModalState.Cancel,
    confirmDisabled,
    existingTx,
    speedUpTxId,
    cancelTxId,
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

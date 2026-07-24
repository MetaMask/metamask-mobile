import { providerErrors } from '@metamask/rpc-errors';
import {
  CANCEL_RATE,
  SPEED_UP_RATE,
  type FeeMarketEIP1559Values,
  type GasPriceValue,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
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
  type ReplacementGasFeeValues,
} from '../../../util/confirmation/gas';
import {
  getPreviousGasFromController,
  speedUpTransaction as speedUpTx,
} from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { LedgerReplacementTxTypes } from '../../UI/LedgerModals/LedgerTransactionModal';
import { type ReplacementTxParams } from '../../../core/HardwareWallet/transactionReplacementParams';
import {
  createQRSigningTransactionModalNavDetails,
  QRSignMode,
} from '../../UI/QRHardware/QRSigningTransactionModal';
import {
  useHardwareWallet,
  executeHardwareWalletOperation,
} from '../../../core/HardwareWallet';
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

function isEip1559GasValues(
  gasValues: GasPriceValue | FeeMarketEIP1559Values,
): gasValues is FeeMarketEIP1559Values {
  return 'maxFeePerGas' in gasValues;
}

function buildReplacementTxParams(
  type: LedgerReplacementTxTypes,
  gasValues: GasPriceValue | FeeMarketEIP1559Values,
): ReplacementTxParams {
  if (isEip1559GasValues(gasValues)) {
    return { type, eip1559GasFee: gasValues };
  }
  return { type, legacyGasFee: gasValues };
}

export function useUnifiedTxActions() {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();
  const toastContext = useContext(ToastContext);
  const toastRef = toastContext?.toastRef;
  const toastRefStable = useRef(toastRef);
  useLayoutEffect(() => {
    toastRefStable.current = toastRef;
  }, [toastRef]);

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

  const isQRHardwareAccount = isHardwareAccount(selectedAddress ?? '', [
    ExtendedKeyringTypes.qr,
  ]);

  const showTransactionUpdateErrorToast = useCallback((error: unknown) => {
    toastRefStable.current?.current?.showToast(
      getTransactionUpdateErrorToastOptions(error),
    );
  }, []);

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
        setPendingOperationAddress,
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
      setPendingOperationAddress,
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

  const handleSpeedUpCancelError = useCallback(
    (error: unknown) => {
      showTransactionUpdateErrorToast(error);
      setSpeedUpCancelModalState(SpeedUpCancelModalState.Closed);
    },
    [showTransactionUpdateErrorToast],
  );

  const speedUpTransaction = async (params?: SpeedUpCancelParams) => {
    if (params && 'error' in params && params.error) {
      handleSpeedUpCancelError(new Error(params.error));
      return;
    }
    if (!speedUpTxId) {
      handleSpeedUpCancelError(
        new Error('Missing transaction id for speed up'),
      );
      return;
    }

    let gasValues: ReplacementGasFeeValues;
    try {
      const rawGasValues = getParamsToSend(params);
      gasValues = getGasValuesForReplacement(
        rawGasValues,
        getPreviousGasFromController(speedUpTxId),
        SPEED_UP_RATE,
      );
    } catch (error: unknown) {
      handleSpeedUpCancelError(error);
      return;
    }

    const speedUpReplacementParams: ReplacementTxParams =
      gasValues == null
        ? { type: LedgerReplacementTxTypes.SPEED_UP }
        : buildReplacementTxParams(
            LedgerReplacementTxTypes.SPEED_UP,
            gasValues,
          );

    try {
      if (isLedgerAccount) {
        await signLedgerTransaction({
          id: speedUpTxId,
          speedUpParams: { type: 'SpeedUp' },
          replacementParams: speedUpReplacementParams,
        });
        return;
      }

      if (isQRHardwareAccount) {
        const transactionId = speedUpTxId;
        navigateWithDetails(
          navigation,
          createQRSigningTransactionModalNavDetails({
            transactionId,
            signMode: QRSignMode.SpeedUp,
            gasValues,
            onConfirmationComplete: () => undefined,
          }),
        );
        onSpeedUpCancelCompleted();
        return;
      }

      await speedUpTx(speedUpTxId, gasValues);
      onSpeedUpCancelCompleted();
    } catch (error: unknown) {
      handleSpeedUpCancelError(error);
    }
  };

  const cancelTransaction = async (params?: SpeedUpCancelParams) => {
    if (params && 'error' in params && params.error) {
      handleSpeedUpCancelError(new Error(params.error));
      return;
    }
    if (!cancelTxId) {
      handleSpeedUpCancelError(new Error('Missing transaction id for cancel'));
      return;
    }

    let gasValues: ReplacementGasFeeValues;
    try {
      const rawGasValues = getParamsToSend(params);
      gasValues = getGasValuesForReplacement(
        rawGasValues,
        getPreviousGasFromController(cancelTxId),
        CANCEL_RATE,
      );
    } catch (error: unknown) {
      handleSpeedUpCancelError(error);
      return;
    }

    const cancelReplacementParams: ReplacementTxParams =
      gasValues == null
        ? { type: LedgerReplacementTxTypes.CANCEL }
        : buildReplacementTxParams(LedgerReplacementTxTypes.CANCEL, gasValues);

    try {
      if (isLedgerAccount) {
        await signLedgerTransaction({
          id: cancelTxId,
          replacementParams: cancelReplacementParams,
        });
        return;
      }

      if (isQRHardwareAccount) {
        const transactionId = cancelTxId;
        navigateWithDetails(
          navigation,
          createQRSigningTransactionModalNavDetails({
            transactionId,
            signMode: QRSignMode.Cancel,
            gasValues,
            onConfirmationComplete: () => undefined,
          }),
        );
        onSpeedUpCancelCompleted();
        return;
      }

      await Engine.context.TransactionController.stopTransaction(
        cancelTxId,
        gasValues,
      );
      onSpeedUpCancelCompleted();
    } catch (error: unknown) {
      handleSpeedUpCancelError(error);
    }
  };

  const signQRTransaction = useCallback(
    async (transactionMeta: TransactionMeta) => {
      navigateWithDetails(
        navigation,
        createQRSigningTransactionModalNavDetails({
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

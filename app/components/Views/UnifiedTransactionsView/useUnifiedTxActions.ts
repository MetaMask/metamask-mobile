import { providerErrors } from '@metamask/rpc-errors';
import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  type FeeMarketGasFeeEstimates,
  type GasFeeEstimates,
  type GasPriceGasFeeEstimates,
  type LegacyGasFeeEstimates,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { getDeviceId } from '../../../core/Ledger/Ledger';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { decGWEIToHexWEI } from '../../../util/conversions';
import { addHexPrefix } from '../../../util/number';
import { speedUpTransaction as speedUpTx } from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import {
  createLedgerTransactionModalNavDetails,
  type ReplacementTxParams,
} from '../../UI/LedgerModals/LedgerTransactionModal';
import { createQRSigningTransactionModalNavDetails } from '../../UI/QRHardware/QRSigningTransactionModal';

type Maybe<T> = T | null | undefined;

interface LegacyExistingGas {
  isEIP1559Transaction?: false;
  gasPrice?: string | number;
}

interface Eip1559ExistingGas {
  isEIP1559Transaction: true;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

type ExistingGas = LegacyExistingGas | Eip1559ExistingGas;

interface ReplacementGasParams {
  error?: string;
  suggestedMaxFeePerGasHex?: string;
  suggestedMaxPriorityFeePerGasHex?: string;
}

interface LedgerSignRequest {
  id: string;
  replacementParams?: ReplacementTxParams;
  speedUpParams?: {
    type?: string;
  };
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : undefined;

export function useUnifiedTxActions() {
  const navigation = useNavigation();

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
  const [existingGas, setExistingGas] = useState<ExistingGas | null>(null);
  const [existingTx, setExistingTx] = useState<TransactionMeta | null>(null);
  const [speedUpTxId, setSpeedUpTxId] = useState<Maybe<string>>(null);
  const [cancelTxId, setCancelTxId] = useState<Maybe<string>>(null);

  const toggleRetry = (msg?: string) => {
    setRetryIsOpen((prev) => !prev);
    setRetryErrorMsg(msg);
  };

  const getGasPriceEstimate = () => {
    if (!gasFeeEstimates) {
      return addHexPrefix(String(decGWEIToHexWEI('0')));
    }

    if ('type' in (gasFeeEstimates as object)) {
      const typedEstimates = gasFeeEstimates as GasFeeEstimates;
      let estimateGweiDecimalRaw: string;

      switch (typedEstimates.type) {
        case GasFeeEstimateType.FeeMarket: {
          const level = (typedEstimates as FeeMarketGasFeeEstimates)[
            GasFeeEstimateLevel.Medium
          ];
          // suggestedMaxFeePerGas exists at medium level in FeeMarket estimates
          estimateGweiDecimalRaw = (
            level as unknown as { suggestedMaxFeePerGas: string }
          ).suggestedMaxFeePerGas;
          break;
        }
        case GasFeeEstimateType.Legacy: {
          estimateGweiDecimalRaw = (typedEstimates as LegacyGasFeeEstimates)[
            GasFeeEstimateLevel.Medium
          ] as unknown as string;
          break;
        }
        case GasFeeEstimateType.GasPrice: {
          estimateGweiDecimalRaw = (typedEstimates as GasPriceGasFeeEstimates)
            .gasPrice as string;
          break;
        }
        default: {
          estimateGweiDecimalRaw = '0';
        }
      }

      return addHexPrefix(
        String(decGWEIToHexWEI(String(estimateGweiDecimalRaw))),
      );
    }

    const maybeFeeMarket = (
      gasFeeEstimates as {
        medium?: { suggestedMaxFeePerGas?: string } | string;
      }
    ).medium;

    if (
      maybeFeeMarket &&
      typeof maybeFeeMarket === 'object' &&
      'suggestedMaxFeePerGas' in maybeFeeMarket
    ) {
      return addHexPrefix(
        String(
          decGWEIToHexWEI(
            String(
              (maybeFeeMarket as { suggestedMaxFeePerGas?: string })
                .suggestedMaxFeePerGas ?? '0',
            ),
          ),
        ),
      );
    }

    if (
      maybeFeeMarket &&
      typeof maybeFeeMarket === 'string' &&
      maybeFeeMarket.length > 0
    ) {
      return addHexPrefix(String(decGWEIToHexWEI(maybeFeeMarket)));
    }

    const maybeGasPrice = (gasFeeEstimates as { gasPrice?: string }).gasPrice;
    if (maybeGasPrice) {
      return addHexPrefix(String(decGWEIToHexWEI(String(maybeGasPrice))));
    }

    return addHexPrefix(String(decGWEIToHexWEI('0')));
  };

  const getCancelOrSpeedupValues = (
    transactionObject?: ReplacementGasParams,
  ) => {
    const { suggestedMaxFeePerGasHex, suggestedMaxPriorityFeePerGasHex } =
      transactionObject ?? {};

    if (suggestedMaxFeePerGasHex) {
      return {
        maxFeePerGas: `0x${suggestedMaxFeePerGasHex}`,
        maxPriorityFeePerGas: `0x${suggestedMaxPriorityFeePerGasHex}`,
      };
    }
    if (
      existingGas &&
      'gasPrice' in existingGas &&
      existingGas.gasPrice !== 0
    ) {
      // Transaction controller will multiply existing gas price by the rate.
      return undefined;
    }
    return { gasPrice: getGasPriceEstimate() };
  };

  const onSpeedUpAction = (
    open: boolean,
    nextExistingGas?: ExistingGas,
    tx?: TransactionMeta,
  ) => {
    if (!open) {
      setSpeedUpIsOpen(false);
      setSpeedUp1559IsOpen(false);
      return;
    }
    setExistingGas(nextExistingGas ?? null);
    setExistingTx(tx ?? null);
    setSpeedUpTxId(tx?.id ?? null);
    if (nextExistingGas?.isEIP1559Transaction) {
      setSpeedUp1559IsOpen(true);
    } else {
      if (!tx) {
        return;
      }
      const disabled = Boolean(
        validateTransactionActionBalance(tx, '1.1', accounts),
      );
      setSpeedUpConfirmDisabled(disabled);
      setSpeedUpIsOpen(true);
    }
  };

  const onCancelAction = (
    open: boolean,
    nextExistingGas?: ExistingGas,
    tx?: TransactionMeta,
  ) => {
    if (!open) {
      setCancelIsOpen(false);
      setCancel1559IsOpen(false);
      return;
    }
    setExistingGas(nextExistingGas ?? null);
    setExistingTx(tx ?? null);
    setCancelTxId(tx?.id ?? null);
    if (nextExistingGas?.isEIP1559Transaction) {
      setCancel1559IsOpen(true);
    } else {
      if (!tx) {
        return;
      }
      const disabled = Boolean(
        validateTransactionActionBalance(tx, '1.1', accounts),
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

  const speedUpTransaction = async (
    transactionObject?: ReplacementGasParams,
  ) => {
    try {
      if (transactionObject?.error) {
        throw new Error(transactionObject.error);
      }
      if (!speedUpTxId) {
        throw new Error('Missing transaction id for speed up');
      }
      await speedUpTx(speedUpTxId, getCancelOrSpeedupValues(transactionObject));
      onSpeedUpCompleted();
    } catch (error: unknown) {
      toggleRetry(getErrorMessage(error));
      setSpeedUp1559IsOpen(false);
      setSpeedUpIsOpen(false);
    }
  };

  const cancelTransaction = async (
    transactionObject?: ReplacementGasParams,
  ) => {
    try {
      if (transactionObject?.error) {
        throw new Error(transactionObject.error);
      }
      if (!cancelTxId) {
        throw new Error('Missing transaction id for cancel');
      }
      await Engine.context.TransactionController.stopTransaction(
        cancelTxId,
        getCancelOrSpeedupValues(transactionObject),
      );
      onCancelCompleted();
    } catch (error: unknown) {
      toggleRetry(getErrorMessage(error));
      setCancel1559IsOpen(false);
      setCancelIsOpen(false);
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

  const signLedgerTransaction = async (transaction: LedgerSignRequest) => {
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

  const cancelUnsignedQRTransaction = async (tx: TransactionMeta) => {
    await Engine.context.ApprovalController.reject(
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

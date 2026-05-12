import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../ui/useFullScreenConfirmation';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { isHardwareAccount } from '../../../../../util/address';
import { createProjectLogger } from '@metamask/utils';
import { useSelectedGasFeeToken } from '../gas/useGasFeeToken';
import { hasTransactionType } from '../../utils/transaction';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { useGaslessSupportedSmartTransactions } from '../gas/useGaslessSupportedSmartTransactions';
import { cloneDeep } from 'lodash';
import {
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
} from '../pay/useTransactionPayData';
import { useMusdConfirmNavigation } from '../../../../UI/Earn/hooks/useMusdConfirmNavigation';
import { useHeadlessBuy } from '../../../../UI/Ramp/headless';
import Engine from '../../../../../core/Engine';
import type { Quote } from '../../../../UI/Ramp/types';
import { useConfirmationContext } from '../../context/confirmation-context';

const log = createProjectLogger('transaction-confirm');

export const GO_BACK_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsWithdraw,
  TransactionType.predictClaim,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function useTransactionConfirm() {
  const { onConfirm: onRequestConfirm } = useApprovalRequest();
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const selectedGasFeeToken = useSelectedGasFeeToken();
  const { chainId, isGasFeeTokenIgnoredIfBalance, type } =
    transactionMetadata ?? {};
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const quotes = useTransactionPayQuotes();
  const fiatPayment = useTransactionPayFiatPayment();
  const { setIsHeadlessBuyInProgress } = useConfirmationContext();
  const isFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
  const orderId = fiatPayment?.orderId as string | undefined;
  const { navigateOnConfirm: musdConversionNavigateOnConfirm } =
    useMusdConfirmNavigation();
  const { startHeadlessBuy } = useHeadlessBuy();

  const { tryEnableEvmNetwork } = useNetworkEnablement();

  const { isSupported: isGaslessSupportedSTX, isSmartTransaction } =
    useGaslessSupportedSmartTransactions();

  const { isSupported: isGaslessSupported } = useIsGaslessSupported();

  const isHardwareWallet = isHardwareAccount(
    transactionMetadata?.txParams?.from ?? '',
  );

  const waitForResult =
    isHardwareWallet ||
    (!isSmartTransaction && !quotes?.length && !selectedGasFeeToken);

  const handleSmartTransaction = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken || isGasFeeTokenIgnoredIfBalance) {
        return;
      }

      updatedMetadata.batchTransactions = [
        ...(updatedMetadata.batchTransactions ?? []),
        selectedGasFeeToken.transferTransaction,
      ];

      updatedMetadata.txParams.gas = selectedGasFeeToken.gas;
      updatedMetadata.txParams.maxFeePerGas = selectedGasFeeToken.maxFeePerGas;
      updatedMetadata.txParams.maxPriorityFeePerGas =
        selectedGasFeeToken.maxPriorityFeePerGas;

      // If the gasless flow is not supported (e.g. stx is disabled by the user,
      // or 7702 is not supported in the chain), we override the
      // `isGasFeeSponsored` flag to `false` so the transaction meta object in
      // state has the correct value for the transaction details on the activity
      // list to not show as sponsored. One limitation on the activity list will
      // be that pre-populated transactions on fresh installs will not show as
      // sponsored even if they were because this is not easily observable onchain
      // for all cases.
      updatedMetadata.isGasFeeSponsored =
        isGaslessSupported && transactionMetadata?.isGasFeeSponsored;
    },
    [
      selectedGasFeeToken,
      isGasFeeTokenIgnoredIfBalance,
      isGaslessSupported,
      transactionMetadata?.isGasFeeSponsored,
    ],
  );

  const handleGasless7702 = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken || isGasFeeTokenIgnoredIfBalance) {
        return;
      }

      updatedMetadata.isExternalSign = true;
      updatedMetadata.isGasFeeSponsored =
        isGaslessSupported && transactionMetadata?.isGasFeeSponsored;
    },
    [
      isGasFeeTokenIgnoredIfBalance,
      isGaslessSupported,
      selectedGasFeeToken,
      transactionMetadata?.isGasFeeSponsored,
    ],
  );

  const onConfirm = useCallback(
    async (options?: {
      onError?: (error: unknown) => void;
      waitForResult?: boolean;
      existingOrderId?: string;
    }) => {
      if (isFiatPaymentSelected && !orderId && !options?.existingOrderId) {
        const rampsQuote = fiatPayment?.rampsQuote as Quote | undefined;
        const assetId = fiatPayment?.caipAssetId as string | undefined;
        const amountFiat = Number(fiatPayment?.amountFiat);

        if (!rampsQuote || !assetId || !amountFiat) {
          log('Fiat payment missing required data', {
            hasQuote: Boolean(rampsQuote),
            assetId,
            amountFiat,
          });
          return;
        }

        setIsHeadlessBuyInProgress(true);

        startHeadlessBuy(
          {
            quote: rampsQuote,
            assetId,
            amount: amountFiat,
            paymentMethodId: fiatPayment?.selectedPaymentMethodId,
            currency: 'USD',
          },
          {
            onOrderCreated: (orderIdFromCallback) => {
              if (!transactionMetadata?.id) {
                return;
              }
              Engine.context.TransactionPayController.updateFiatPayment({
                transactionId: transactionMetadata.id,
                callback: (fp) => {
                  fp.orderId = orderIdFromCallback;
                },
              });
            },
            onError: (error) => {
              setIsHeadlessBuyInProgress(false);
            },
            onClose: (info) => {
              setIsHeadlessBuyInProgress(false);
            },
          },
        );
        return;
      }

      if (!transactionMetadata) {
        return;
      }

      const updatedMetadata = cloneDeep(transactionMetadata);

      if (isGaslessSupportedSTX && !isHardwareWallet) {
        handleSmartTransaction(updatedMetadata);
      } else if (selectedGasFeeToken && !isHardwareWallet) {
        handleGasless7702(updatedMetadata);
      }

      const effectiveWaitForResult = options?.waitForResult ?? waitForResult;

      try {
        await onRequestConfirm(
          {
            deleteAfterResult: true,
            // Intentionally not hiding errors so we can log
            handleErrors: false,
            waitForResult: effectiveWaitForResult,
          },
          { txMeta: updatedMetadata },
        );
      } catch (error) {
        log('Error confirming transaction', error);
        options?.onError?.(error);
      }

      // Perps deposit-and-order: caller handles navigation (e.g. order flow)
      if (type === TransactionType.perpsDepositAndOrder) {
        return;
      } else if (type === TransactionType.perpsDeposit) {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.PERPS_HOME,
        });
      } else if (type === TransactionType.musdConversion) {
        musdConversionNavigateOnConfirm();
      } else if (
        isFullScreenConfirmation &&
        !hasTransactionType(transactionMetadata, GO_BACK_TYPES)
      ) {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      } else {
        navigation.goBack();
      }

      tryEnableEvmNetwork(chainId);
    },
    [
      chainId,
      fiatPayment,
      handleGasless7702,
      handleSmartTransaction,
      isFiatPaymentSelected,
      isFullScreenConfirmation,
      isGaslessSupportedSTX,
      navigation,
      musdConversionNavigateOnConfirm,
      onRequestConfirm,
      orderId,
      setIsHeadlessBuyInProgress,
      selectedGasFeeToken,
      startHeadlessBuy,
      transactionMetadata,
      tryEnableEvmNetwork,
      type,
      waitForResult,
      isHardwareWallet,
    ],
  );

  return { onConfirm };
}

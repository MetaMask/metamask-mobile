import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmActions } from '../useConfirmActions';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { selectUseTransactionSimulations } from '../../../../../selectors/preferencesController';
import { useHasInsufficientBalance } from '../useHasInsufficientBalance';

const IGNORE_TYPES = [TransactionType.predictWithdraw];

export const useInsufficientBalanceAlert = ({
  ignoreGasFeeToken,
}: {
  ignoreGasFeeToken?: boolean;
} = {}): Alert[] => {
  const { goToBuy } = useRampNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const { isTransactionValueUpdating } = useConfirmationContext();
  const { onReject } = useConfirmActions();
  const { isSupported: isGaslessSupported, pending: isGaslessCheckPending } =
    useIsGaslessSupported();
  const isUsingPay = useTransactionPayHasSourceAmount();
  const isSimulationEnabled = useSelector(selectUseTransactionSimulations);
  const { hasInsufficientBalance, nativeCurrency } =
    useHasInsufficientBalance();

  return useMemo(() => {
    if (!transactionMetadata || isTransactionValueUpdating || isUsingPay) {
      return [];
    }

    const { selectedGasFeeToken, isGasFeeSponsored, gasFeeTokens } =
      transactionMetadata;

    const isGasFeeTokensEmpty = gasFeeTokens?.length === 0;

    // Check if gasless check has completed (regardless of result)
    const isGaslessCheckComplete = !isGaslessCheckPending;

    // Transaction is sponsored only if it's marked as sponsored AND gasless is supported
    const isSponsoredTransaction = isGasFeeSponsored && isGaslessSupported;

    // Simulation is complete if it's disabled, or if enabled and gasFeeTokens is loaded
    const isSimulationComplete = !isSimulationEnabled || Boolean(gasFeeTokens);

    // Check if user has selected a gas fee token (or we're ignoring that check)
    const hasNoGasFeeTokenSelected = ignoreGasFeeToken || !selectedGasFeeToken;

    // Gasless check is complete AND one of:
    //  - Gasless is NOT supported (native currency needed for gas)
    //  - Gasless IS supported but no alternative gas fee tokens are available
    //  - Gas fee tokens are available but none is selected
    const shouldCheckGaslessConditions =
      isGaslessCheckComplete &&
      (!isGaslessSupported ||
        isGasFeeTokensEmpty ||
        (!isGasFeeTokensEmpty && !selectedGasFeeToken));

    const showAlert =
      hasInsufficientBalance &&
      isSimulationComplete &&
      hasNoGasFeeTokenSelected &&
      shouldCheckGaslessConditions &&
      !hasTransactionType(transactionMetadata, IGNORE_TYPES) &&
      !isSponsoredTransaction;

    if (!showAlert) {
      return [];
    }

    return [
      {
        action: {
          label: strings('alert_system.insufficient_balance.buy_action', {
            nativeCurrency,
          }),
          callback: () => {
            goToBuy();
            onReject(undefined, true);
          },
        },
        isBlocking: true,
        field: RowAlertKey.EstimatedFee,
        key: AlertKeys.InsufficientBalance,
        message: strings('alert_system.insufficient_balance.message', {
          nativeCurrency,
        }),
        title: strings('alert_system.insufficient_balance.title'),
        severity: Severity.Danger,
        skipConfirmation: true,
      },
    ];
  }, [
    transactionMetadata,
    isTransactionValueUpdating,
    isGaslessCheckPending,
    isGaslessSupported,
    isSimulationEnabled,
    ignoreGasFeeToken,
    isUsingPay,
    hasInsufficientBalance,
    nativeCurrency,
    goToBuy,
    onReject,
  ]);
};

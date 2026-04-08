import { TransactionMeta } from '@metamask/transaction-controller';
import { useCallback, useEffect, useState } from 'react';
import { updateSelectedGasFeeToken } from '../../../../util/transaction-controller';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { useIsGaslessSupported } from './gas/useIsGaslessSupported';
import { useConfirmationMetricEvents } from './metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useHasInsufficientBalance } from './useHasInsufficientBalance';

export function useAutomaticGasFeeTokenSelect() {
  const { isSupported: isGaslessSupported, isSmartTransaction } =
    useIsGaslessSupported();
  const { hasInsufficientBalance } = useHasInsufficientBalance();
  const transactionMeta =
    (useTransactionMetadataRequest() as TransactionMeta) ??
    ({} as TransactionMeta);
  const [checked, setChecked] = useState(false);
  const { setConfirmationMetric } = useConfirmationMetricEvents();

  const {
    gasFeeTokens,
    id: transactionId,
    selectedGasFeeToken,
    excludeNativeTokenForFee,
  } = transactionMeta;

  const [first, second] = gasFeeTokens || [];
  const shouldSkipNativeToken =
    first?.tokenAddress === NATIVE_TOKEN_ADDRESS &&
    (!isSmartTransaction || excludeNativeTokenForFee);

  const firstGasFeeTokenAddress = shouldSkipNativeToken
    ? second?.tokenAddress
    : first?.tokenAddress;

  const selectFirstToken = useCallback(() => {
    if (!transactionId || !firstGasFeeTokenAddress) {
      return;
    }
    updateSelectedGasFeeToken(transactionId, firstGasFeeTokenAddress);
  }, [transactionId, firstGasFeeTokenAddress]);

  /**
   * Selecting first gas fee token when `selectedGasFeeToken` is set but
   * actually doesn't exist in the gasFeeTokens list.
   * Since this logic is introduced with Tempo we use `excludeNativeTokenForFee`
   * (only be set for Tempo as of now) to reduce regression risks.
   */
  const hasSelectedGasFeeTokenNotInList =
    excludeNativeTokenForFee &&
    selectedGasFeeToken &&
    !gasFeeTokens?.find(
      ({ tokenAddress }) =>
        tokenAddress.toLocaleLowerCase() ===
        selectedGasFeeToken.toLocaleLowerCase(),
    );

  const shouldSelect =
    Boolean(firstGasFeeTokenAddress) &&
    !checked &&
    ((isGaslessSupported && hasInsufficientBalance && !selectedGasFeeToken) ||
      hasSelectedGasFeeTokenNotInList);

  useEffect(() => {
    if (shouldSelect) {
      selectFirstToken();
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const automatic_fee_token_selected = gasFeeTokens?.find(
        ({ tokenAddress }) => tokenAddress === firstGasFeeTokenAddress,
      )?.symbol;
      setConfirmationMetric({
        properties: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          automatic_fee_token_selection: true,
          automatic_fee_token_selected,
        },
      });
      setChecked(true);
    }
  }, [
    shouldSelect,
    selectFirstToken,
    gasFeeTokens,
    firstGasFeeTokenAddress,
    setConfirmationMetric,
  ]);
}

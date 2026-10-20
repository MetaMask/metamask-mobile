import { useSelector } from 'react-redux';

import { GasFeeToken } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { useHasInsufficientBalance } from '../useHasInsufficientBalance';
import { useIsGaslessSupported } from './useIsGaslessSupported';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { shouldApplyGasFeeSponsorship } from '../../utils/transaction';
import { selectUseTransactionSimulations } from '../../../../../selectors/preferencesController';

// Chains with no native may have selectedGasFeeToken inconsistent with gasFeeTokens
function hasWrongSelectedGasFeeToken({
  gasFeeTokens,
  selectedGasFeeToken,
}: {
  gasFeeTokens: GasFeeToken[];
  selectedGasFeeToken?: Hex;
}) {
  return (
    gasFeeTokens.length &&
    selectedGasFeeToken &&
    selectedGasFeeToken !== NATIVE_TOKEN_ADDRESS &&
    !gasFeeTokens.some(
      ({ tokenAddress }) =>
        tokenAddress?.toLocaleLowerCase() ===
        selectedGasFeeToken?.toLocaleLowerCase(),
    )
  );
}

export function useIsGaslessLoading() {
  const transactionMeta = useTransactionMetadataRequest();

  const { gasFeeTokens, excludeNativeTokenForFee, selectedGasFeeToken } =
    transactionMeta ?? {};

  const {
    isSupported: isGaslessSupported,
    pending: isGaslessSupportedPending,
  } = useIsGaslessSupported();
  const isSimulationEnabled = useSelector(selectUseTransactionSimulations);

  const { hasInsufficientBalance } = useHasInsufficientBalance();

  const isGaslessSupportedFinished =
    !isGaslessSupportedPending && isGaslessSupported;
  const isGasFeeTokensPending = gasFeeTokens === undefined;
  const isGasFeeTokensEmpty =
    gasFeeTokens !== undefined && gasFeeTokens.length === 0;

  // Sponsored txs don't need a gas fee token, so don't wait on `gasFeeTokens`.
  const isGasFeeSponsored = shouldApplyGasFeeSponsorship({
    transactionMeta,
    isGaslessSupported,
  });

  const hasNoNativeTokenAvailable =
    excludeNativeTokenForFee || hasInsufficientBalance;

  const isGaslessLoading = Boolean(
    !isGasFeeSponsored &&
      isSimulationEnabled &&
      hasNoNativeTokenAvailable &&
      (isGaslessSupportedPending || isGaslessSupportedFinished) &&
      (isGasFeeTokensPending ||
        (!excludeNativeTokenForFee && isGasFeeTokensEmpty) ||
        (excludeNativeTokenForFee &&
          hasWrongSelectedGasFeeToken({ gasFeeTokens, selectedGasFeeToken }))),
  );

  return { isGaslessLoading };
}

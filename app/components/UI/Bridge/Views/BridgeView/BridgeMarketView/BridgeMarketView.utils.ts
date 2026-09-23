import { isArcTokenUSDC } from '../../../../../../enablement/assets/arc';
import type { BridgeToken } from '../../../types';

/**
 * Returns the normalized warning flags used by quote analytics.
 *
 * @param hasInsufficientGas - Whether the selected quote has insufficient gas.
 * @param hasInsufficientNativeReserveError - Whether the source amount would leave less than the required native reserve.
 * @param sourceToken - The selected source token used to identify network-specific reserve handling.
 */
export const getQuoteEventWarningState = ({
  hasInsufficientGas,
  hasInsufficientNativeReserveError,
  sourceToken,
}: {
  hasInsufficientGas: boolean;
  hasInsufficientNativeReserveError: boolean;
  sourceToken?: BridgeToken | null;
}) => {
  // Arc uses USDC as the native gas token, so leaving less than the required
  // USDC reserve is surfaced as insufficient gas error
  const hasArcInsufficientNativeReserveError = Boolean(
    hasInsufficientNativeReserveError &&
      sourceToken &&
      isArcTokenUSDC(sourceToken),
  );

  return {
    hasInsufficientNativeReserveError:
      hasInsufficientNativeReserveError &&
      !hasArcInsufficientNativeReserveError,
    hasInsufficientGas:
      hasInsufficientGas || hasArcInsufficientNativeReserveError,
  };
};

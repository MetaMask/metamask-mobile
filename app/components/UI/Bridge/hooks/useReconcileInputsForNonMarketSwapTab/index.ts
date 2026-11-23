import { useLayoutEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  resetBridgeDestToken,
  resetBridgeTokenInputs,
  setDestToken,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import {
  selectBridgeLimitOrderFeatureFlags,
  selectBridgeRecurringBuyFeatureFlags,
} from '../../../../../selectors/bridge/featureFlags';
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import type { BridgeToken } from '../../types';
import {
  getDefaultTokenPairForChains,
  getNativeSourceToken,
  isNetworkSupportedForNonMarketSwapTab,
  isSameBridgeToken,
  isTokenSupportedForNonMarketSwapTab,
} from '../../utils/tokenUtils';

interface ReconcileInputsForNonMarketSwapTabParams {
  renderedTab: BridgeTabKey;
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
}

/**
 * Reconciles shared Swaps inputs when Limit or Recurring becomes the rendered
 * tab. A supported network is an enabled EVM chain. A supported token is an
 * eligible token on that network, such as a non-RWA token. Limit and Recurring
 * require the destination token to be on the source network.
 *
 * Same-chain:
 * - Both tokens valid: preserve pair and amount.
 * - Source only valid: preserve source, use default destination, clear amount.
 * - Destination only valid: use default source, preserve destination, clear
 * amount.
 * - Neither token valid: use the source network's defaults and clear amount.
 *
 * Cross-chain:
 * - Source valid: preserve source, use its network's default destination, and
 * clear amount.
 * - Source invalid: use the source network's defaults and clear amount.
 *
 * - Unsupported source network: use the target tab's overall default pair and
 * clear the amount.
 * - Market: no reconciliation.
 *
 * Reconciliation runs once per rendered tab and enabled-chain configuration.
 * This preserves subsequent token edits made while the user remains on that
 * tab. A layout effect prevents unsupported inputs from painting or starting a
 * stale quote request.
 */
export function useReconcileInputsForNonMarketSwapTab({
  renderedTab,
  sourceToken,
  destToken,
}: ReconcileInputsForNonMarketSwapTabParams): void {
  const dispatch = useDispatch();
  const limitOrderFeatureFlags = useSelector(
    selectBridgeLimitOrderFeatureFlags,
  );
  const recurringBuyFeatureFlags = useSelector(
    selectBridgeRecurringBuyFeatureFlags,
  );

  // Limit and Recurring can have different supported network configurations.
  const enabledChainIds =
    renderedTab === BridgeTabKey.Limit
      ? limitOrderFeatureFlags?.enabledChainIds
      : renderedTab === BridgeTabKey.Recurring
        ? recurringBuyFeatureFlags?.enabledChainIds
        : undefined;

  // Include the configuration so a remote flag update triggers reconciliation.
  const reconciliationKey = `${renderedTab}:${
    enabledChainIds?.join(',') ?? 'pending'
  }`;
  const lastReconciliationKeyRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    if (lastReconciliationKeyRef.current === reconciliationKey) {
      return;
    }
    lastReconciliationKeyRef.current = reconciliationKey;

    // Market accepts the broader set of supported swap and bridge pairs.
    if (renderedTab === BridgeTabKey.Market || !enabledChainIds) {
      return;
    }

    const sourceChainId = sourceToken
      ? formatChainIdToCaip(sourceToken.chainId)
      : undefined;
    const isSourceNetworkSupported =
      isNetworkSupportedForNonMarketSwapTab(
        sourceToken?.chainId,
        enabledChainIds,
      ) && sourceChainId !== undefined;
    const defaultPair = getDefaultTokenPairForChains(
      isSourceNetworkSupported ? [sourceChainId] : enabledChainIds,
    );
    if (!defaultPair?.destToken) {
      return;
    }

    const nextSourceToken = isTokenSupportedForNonMarketSwapTab(
      sourceToken,
      enabledChainIds,
    )
      ? sourceToken
      : defaultPair.sourceToken;
    const nextSourceChainId = formatChainIdToCaip(nextSourceToken.chainId);
    let nextDestToken = defaultPair.destToken;

    if (
      isSourceNetworkSupported &&
      isTokenSupportedForNonMarketSwapTab(destToken, enabledChainIds) &&
      formatChainIdToCaip(destToken.chainId) === nextSourceChainId &&
      !isSameBridgeToken(nextSourceToken, destToken)
    ) {
      nextDestToken = destToken;
    }

    if (isSameBridgeToken(nextSourceToken, nextDestToken)) {
      const nativeToken = getNativeSourceToken(nextSourceChainId);
      if (isSameBridgeToken(nextSourceToken, nativeToken)) {
        return;
      }
      nextDestToken = nativeToken;
    }

    const isSourcePreserved = isSameBridgeToken(sourceToken, nextSourceToken);
    const isDestPreserved = isSameBridgeToken(destToken, nextDestToken);

    if (isSourcePreserved && isDestPreserved) {
      return;
    }

    if (isSourcePreserved) {
      // Preserve the source token, but clear amounts and quote state because
      // the destination pair changed.
      dispatch(resetBridgeTokenInputs());
      dispatch(resetBridgeDestToken());
      dispatch(setDestToken(nextDestToken));
      return;
    }

    // A replaced source token cannot carry its amount into the new pair.
    dispatch(resetBridgeTokenInputs());
    dispatch(resetBridgeDestToken());
    dispatch(setSourceToken(nextSourceToken));
    dispatch(setDestToken(nextDestToken));
  }, [
    destToken,
    dispatch,
    enabledChainIds,
    reconciliationKey,
    renderedTab,
    sourceToken,
  ]);
}

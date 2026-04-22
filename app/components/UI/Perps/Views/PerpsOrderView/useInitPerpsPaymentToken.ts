import { useEffect, useRef } from 'react';
import { type Hex } from '@metamask/utils';
import { selectPendingTradeConfiguration } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { usePerpsSelector } from '../../hooks/usePerpsSelector';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { usePerpsPayWithToken } from '../../hooks/useIsPerpsBalanceSelected';
import {
  arePaymentTokensEqual,
  useDefaultPayWithTokenWhenNoPerpsBalance,
  useHasNativeTradeablePerpsBalance,
  usePreferredFallbackPayTokenCandidate,
} from '../../hooks/useDefaultPayWithTokenWhenNoPerpsBalance';

export function useInitPerpsPaymentToken(initialAsset: string) {
  const { payToken, setPayToken } = useTransactionPayToken();
  const selectedPaymentToken = usePerpsPayWithToken();
  const hasNativeTradeablePerpsBalance = useHasNativeTradeablePerpsBalance();
  const fallbackPayTokenCandidate = usePreferredFallbackPayTokenCandidate();
  const defaultPayTokenWhenNoPerpsBalance =
    useDefaultPayWithTokenWhenNoPerpsBalance();

  const pendingConfig = usePerpsSelector((state) =>
    selectPendingTradeConfiguration(state, initialAsset),
  );
  const pendingConfigSelectedPaymentToken = pendingConfig?.selectedPaymentToken;
  const pendingConfigSelectedPaymentTokenSource =
    pendingConfig?.selectedPaymentTokenSource;

  const appliedPendingTokenRef = useRef<
    { address: string; chainId: string } | null | undefined
  >(undefined);
  const prevInitialAssetRef = useRef(initialAsset);
  if (prevInitialAssetRef.current !== initialAsset) {
    prevInitialAssetRef.current = initialAsset;
    appliedPendingTokenRef.current = undefined;
  }

  useEffect(
    () => () => {
      Engine.context.PerpsController?.setSelectedPaymentToken?.(null);
    },
    [initialAsset],
  );

  useEffect(() => {
    if (
      pendingConfigSelectedPaymentToken != null ||
      appliedPendingTokenRef.current != null
    )
      return;

    const defaultToken = defaultPayTokenWhenNoPerpsBalance;
    if (defaultToken != null) {
      appliedPendingTokenRef.current = {
        address: defaultToken.address,
        chainId: defaultToken.chainId,
      };
      setPayToken({
        address: defaultToken.address as Hex,
        chainId: defaultToken.chainId as Hex,
      });
      Engine.context.PerpsController?.setSelectedPaymentToken?.({
        description: defaultToken.description,
        address: defaultToken.address as Hex,
        chainId: defaultToken.chainId as Hex,
      });

      return;
    }

    if (appliedPendingTokenRef.current === null) return;
    appliedPendingTokenRef.current = null;
    Engine.context.PerpsController?.setSelectedPaymentToken?.(null);
  }, [
    pendingConfigSelectedPaymentToken,
    defaultPayTokenWhenNoPerpsBalance,
    setPayToken,
  ]);

  useEffect(() => {
    if (!pendingConfigSelectedPaymentToken) return;

    const pendingAddr = pendingConfigSelectedPaymentToken.address;
    const pendingChainId = pendingConfigSelectedPaymentToken.chainId;
    // Compatibility shim for pending configs persisted before
    // selectedPaymentTokenSource existed. Safe to remove after the 5-minute
    // pending-config TTL has cycled past release.
    const isLegacyAutoFallbackToken =
      pendingConfigSelectedPaymentTokenSource == null &&
      arePaymentTokensEqual(
        pendingConfigSelectedPaymentToken,
        fallbackPayTokenCandidate,
      );
    const isAutoFallbackToken =
      pendingConfigSelectedPaymentTokenSource === 'autoNoPerpsBalance' ||
      isLegacyAutoFallbackToken;
    const shouldRestorePendingToken =
      pendingConfigSelectedPaymentTokenSource === 'explicit' ||
      !isAutoFallbackToken ||
      !hasNativeTradeablePerpsBalance;
    const alreadyApplied =
      appliedPendingTokenRef.current !== undefined &&
      (appliedPendingTokenRef.current === null
        ? false
        : appliedPendingTokenRef.current.address === pendingAddr &&
          appliedPendingTokenRef.current.chainId === pendingChainId);
    if (alreadyApplied) return;

    if (!shouldRestorePendingToken) {
      appliedPendingTokenRef.current = {
        address: pendingAddr,
        chainId: pendingChainId,
      };
      Engine.context.PerpsController?.setSelectedPaymentToken?.(null);
      return;
    }

    appliedPendingTokenRef.current = {
      address: pendingAddr,
      chainId: pendingChainId,
    };

    if (
      payToken?.address !== pendingAddr ||
      payToken?.chainId !== pendingChainId ||
      selectedPaymentToken?.address !== pendingAddr ||
      selectedPaymentToken?.chainId !== pendingChainId
    ) {
      setPayToken({
        address: pendingAddr as Hex,
        chainId: pendingChainId as Hex,
      });

      Engine.context.PerpsController?.setSelectedPaymentToken?.({
        description: pendingConfigSelectedPaymentToken.description,
        address: pendingAddr as Hex,
        chainId: pendingChainId as Hex,
      });
    }
  }, [
    fallbackPayTokenCandidate,
    hasNativeTradeablePerpsBalance,
    initialAsset,
    payToken,
    pendingConfigSelectedPaymentToken,
    pendingConfigSelectedPaymentTokenSource,
    setPayToken,
    selectedPaymentToken,
  ]);
}

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
  const defaultPayTokenWhenNoPerpsBalance =
    useDefaultPayWithTokenWhenNoPerpsBalance();
  const fallbackPayTokenCandidate = usePreferredFallbackPayTokenCandidate();
  const hasNativeTradeablePerpsBalance = useHasNativeTradeablePerpsBalance();

  const pendingConfig = usePerpsSelector((state) =>
    selectPendingTradeConfiguration(state, initialAsset),
  );
  const pendingConfigSelectedPaymentToken = pendingConfig?.selectedPaymentToken;

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
    const alreadyApplied =
      appliedPendingTokenRef.current !== undefined &&
      (appliedPendingTokenRef.current === null
        ? false
        : appliedPendingTokenRef.current.address === pendingAddr &&
          appliedPendingTokenRef.current.chainId === pendingChainId);
    if (alreadyApplied) return;

    // Saved token was previously auto-selected (pay-with-any-token fallback)
    // but the user now has native perps buying power. Clear the stale selection
    // so the form defaults to Perps balance.
    const isStaleAutoFallback =
      hasNativeTradeablePerpsBalance &&
      arePaymentTokensEqual(
        pendingConfigSelectedPaymentToken,
        fallbackPayTokenCandidate,
      );
    if (isStaleAutoFallback) {
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
    setPayToken,
    selectedPaymentToken,
  ]);
}

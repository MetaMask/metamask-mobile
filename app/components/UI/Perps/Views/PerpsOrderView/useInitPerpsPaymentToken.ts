import { useEffect, useRef } from 'react';
import { type Hex } from '@metamask/utils';
import { selectPendingTradeConfiguration } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { usePerpsSelector } from '../../hooks/usePerpsSelector';
import { useIsMoneyAccountPaymentOverride } from '../../../../Views/confirmations/hooks/pay/useIsMoneyAccountPaymentOverride';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { usePerpsPayWithToken } from '../../hooks/useIsPerpsBalanceSelected';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from '../../hooks/useDefaultPayWithTokenWhenNoPerpsBalance';

export function useInitPerpsPaymentToken(initialAsset: string) {
  const { payToken, setPayToken } = useTransactionPayToken();
  const selectedPaymentToken = usePerpsPayWithToken();
  const defaultPayTokenWhenNoPerpsBalance =
    useDefaultPayWithTokenWhenNoPerpsBalance();
  // Paying from the Money Account owns the pay token (mUSD on Monad). Letting
  // the allowlist default run would overwrite it and silently switch the
  // funding source back to the EOA.
  const isMoneyAccountSelected = useIsMoneyAccountPaymentOverride();

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
      isMoneyAccountSelected ||
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
    isMoneyAccountSelected,
    pendingConfigSelectedPaymentToken,
    defaultPayTokenWhenNoPerpsBalance,
    setPayToken,
  ]);

  useEffect(() => {
    if (isMoneyAccountSelected || !pendingConfigSelectedPaymentToken) return;

    const pendingAddr = pendingConfigSelectedPaymentToken.address;
    const pendingChainId = pendingConfigSelectedPaymentToken.chainId;
    const alreadyApplied =
      appliedPendingTokenRef.current !== undefined &&
      (appliedPendingTokenRef.current === null
        ? false
        : appliedPendingTokenRef.current.address === pendingAddr &&
          appliedPendingTokenRef.current.chainId === pendingChainId);
    if (alreadyApplied) return;

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
    initialAsset,
    isMoneyAccountSelected,
    payToken,
    pendingConfigSelectedPaymentToken,
    setPayToken,
    selectedPaymentToken,
  ]);
}

import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useEffect } from 'react';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import { useAutomaticMoneyAccountPayToken } from './useAutomaticMoneyAccountPayToken';
import { useDefaultPaySelectedSection } from './useDefaultPaySelectedSection';
import { useIsMoneyAccountPaymentOverride } from './useIsMoneyAccountPaymentOverride';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

/**
 * Enables Money Account as a payment source for the perps and predict
 * deposit-and-order flows.
 *
 * The plain `perpsDeposit` / `predictDeposit` confirmations get this for free:
 * they render `CustomAmountInfo`, which mounts `useAutomaticTransactionPayToken`
 * (and through it the money-account fallback), and their info components mount
 * `useDefaultPaySelectedSection` for the `defaultPaySelectedSection` flag.
 *
 * The deposit-and-order flows render their own product views instead
 * (`PerpsOrderView` / `PredictBuyWithAnyToken`) and never mount either hook, so
 * without this the Money Account could only ever be selected by hand — and the
 * remote flag had no effect at all. This hook supplies just those two pieces,
 * deliberately *not* the rest of `useAutomaticTransactionPayToken`, because
 * each order view already owns its own pay-token defaulting.
 *
 * Also mirrors the resolved override onto the pay token. The money-account
 * fallback and the flag both only write `paymentOverride`; in the
 * `CustomAmountInfo` flows `useAutomaticTransactionPayToken` is what turns that
 * into the mUSD-on-Monad pay token the quote is actually built from.
 */
export function useMoneyAccountDepositAndOrder(): void {
  useDefaultPaySelectedSection();

  const { payToken, setPayToken } = useTransactionPayToken();
  const { hasTokens } = useTransactionPayAvailableTokens();
  const fiatPayment = useTransactionPayFiatPayment();

  useAutomaticMoneyAccountPayToken({
    hasFiatPaymentSelected: Boolean(fiatPayment?.selectedPaymentMethodId),
    hasTokenBalance: hasTokens,
    payTokenSelected: Boolean(payToken),
  });

  const isMoneyAccountSelected = useIsMoneyAccountPaymentOverride();

  const isPayTokenMusdOnMonad =
    payToken?.chainId?.toLowerCase() === CHAIN_IDS.MONAD.toLowerCase() &&
    payToken?.address?.toLowerCase() === MUSD_TOKEN_ADDRESS.toLowerCase();

  useEffect(() => {
    if (!isMoneyAccountSelected || isPayTokenMusdOnMonad) {
      return;
    }

    setPayToken({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
  }, [isMoneyAccountSelected, isPayTokenMusdOnMonad, setPayToken]);
}

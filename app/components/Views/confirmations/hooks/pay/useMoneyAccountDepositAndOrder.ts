import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import { useAutomaticMoneyAccountPayToken } from './useAutomaticMoneyAccountPayToken';
import { useDefaultPaySelectedSection } from './useDefaultPaySelectedSection';
import { useIsMoneyAccountPaymentOverride } from './useIsMoneyAccountPaymentOverride';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { selectEvmAssetIdResolver } from '../../../../../selectors/assets/assets-controller';
import { isSameAssetId } from '../../../../../util/transactions/payment-token';

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
 *
 * @param options - Hook options.
 * @param options.disable - Set `true` while the product balance can already
 * fund the order. Both automatic paths only look at the EOA token balance, so
 * an empty wallet otherwise selects the Money Account over a funded Perps or
 * Predict balance. Selecting the Money Account by hand is unaffected.
 */
export function useMoneyAccountDepositAndOrder({
  disable = false,
}: { disable?: boolean } = {}): void {
  useDefaultPaySelectedSection({ disable });

  const { payToken, setPayToken } = useTransactionPayToken();
  const resolveAssetId = useSelector(selectEvmAssetIdResolver);
  const { availableTokens } = useTransactionPayAvailableTokens();
  const fiatPayment = useTransactionPayFiatPayment();

  useAutomaticMoneyAccountPayToken({
    availableTokens,
    disable,
    hasFiatPaymentSelected: Boolean(fiatPayment?.selectedPaymentMethodId),
    payTokenSelected: Boolean(payToken),
  });

  const isMoneyAccountSelected = useIsMoneyAccountPaymentOverride();

  const musdOnMonadAssetId = resolveAssetId({
    address: MUSD_TOKEN_ADDRESS,
    chainId: CHAIN_IDS.MONAD,
  });
  const isPayTokenMusdOnMonad = isSameAssetId(
    payToken?.assetId,
    musdOnMonadAssetId,
  );

  useEffect(() => {
    if (!isMoneyAccountSelected || isPayTokenMusdOnMonad) {
      return;
    }

    setPayToken({ assetId: musdOnMonadAssetId });
  }, [
    isMoneyAccountSelected,
    isPayTokenMusdOnMonad,
    musdOnMonadAssetId,
    setPayToken,
  ]);
}

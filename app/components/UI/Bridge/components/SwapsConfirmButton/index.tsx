import React, { useMemo, useEffect, useRef } from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsSolanaSourced,
  selectIsSubmittingTx,
  selectSourceAmount,
  selectSourceToken,
  setIsSubmittingTx,
} from '../../../../../core/redux/slices/bridge';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import { BridgeQuoteResponse } from '../../types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { BridgeRouteParams } from '../../hooks/useSwapBridgeNavigation';
import { calcTokenValue } from '../../../../../util/transactions';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  /** Optional testID override (e.g. when rendered inside keypad to avoid duplicate IDs in E2E) */
  testID?: string;
}

export const SwapsConfirmButton = ({ latestSourceBalance, testID }: Props) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  /** The entry point location for analytics (e.g. Main View, Token View, Trending Explore) */
  const location = route.params?.location;

  const { submitBridgeTx } = useSubmitBridgeTx();
  const updateQuoteParams = useBridgeQuoteRequest();
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;
  const isSolanaSourced = useSelector(selectIsSolanaSourced);

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const {
    activeQuote,
    isLoading,
    isExpired,
    blockaidError,
    quoteFetchError,
    isNoQuotesAvailable,
  } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });

  // The quote expired and no fetch is in progress — offer to get a new one.
  // Also treat the edge-case where a fetch IS running but there is no active
  // quote to fall back on — the user would otherwise be stuck on a spinner
  // with no way to retry ("escape hatch").
  const needsNewQuote =
    isExpired && !isSubmittingTx && (!isLoading || !activeQuote);

  // Check both the display amount and the atomic amount are non-zero.
  // An amount like 0.000000001 BTC (8 decimals) is non-zero as a number but
  // resolves to 0 satoshis, meaning no quote will be fetched.
  const hasNonZeroSourceAmount = useMemo(() => {
    const nonZeroInputAmount = !!sourceAmount && Number(sourceAmount) !== 0;
    try {
      return (
        nonZeroInputAmount &&
        (sourceToken?.decimals === undefined ||
          calcTokenValue(
            // If user pressed dot as first input character
            // default the value to zero.
            sourceAmount === '.' ? '0' : sourceAmount,
            sourceToken.decimals,
          ).toFixed(0) !== '0')
      );
    } catch {
      // We reach this state when calcTokenValue is unable to calculate the value.
      // This should not happen under normal circumstances, but we implement this
      // guard to defend against unkown conditions.
      return nonZeroInputAmount;
    }
  }, [sourceAmount, sourceToken?.decimals]);

  // Track the sourceAmount that the current quote was settled for.
  // The ref only updates when loading finishes (quote arrived / error)
  // so it stays stale during the debounce window after the user edits.
  const settledAmountRef = useRef(sourceAmount);
  const wasLoadingRef = useRef(isLoading);

  const hasError = !!blockaidError || !!quoteFetchError || isNoQuotesAvailable;

  useEffect(() => {
    const loadingJustFinished = wasLoadingRef.current && !isLoading;
    if (loadingJustFinished || hasError || needsNewQuote) {
      settledAmountRef.current = sourceAmount;
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, sourceAmount, hasError, needsNewQuote]);

  const isSourceAmountChanged = sourceAmount !== settledAmountRef.current;

  // True when user has entered a valid amount but the quote fetch hasn't
  // started yet (e.g. during the debounce window after typing).
  const isAwaitingQuote =
    hasNonZeroSourceAmount && !activeQuote && !isLoading && !needsNewQuote;

  // True when the sourceAmount changed from what the current quote was
  // fetched for (stale quote during debounce window).
  const isPendingQuoteRefresh = isSourceAmountChanged && hasNonZeroSourceAmount;

  const isSubmitDisabled =
    !hasNonZeroSourceAmount ||
    isAwaitingQuote ||
    isPendingQuoteRefresh ||
    (isLoading && !activeQuote) ||
    hasInsufficientBalance ||
    isSubmittingTx ||
    (isHardwareAddress && isSolanaSourced) ||
    hasError ||
    !hasSufficientGas ||
    !walletAddress;

  const handleContinue = async () => {
    try {
      if (activeQuote && walletAddress) {
        dispatch(setIsSubmittingTx(true));

        const quoteResponse: BridgeQuoteResponse = {
          ...activeQuote,
          aggregator: activeQuote.quote.bridgeId,
          walletAddress,
        };

        await submitBridgeTx({
          quoteResponse,
          location,
        });
      }
    } catch (error) {
      console.error('Error submitting bridge tx', error);
    } finally {
      dispatch(setIsSubmittingTx(false));
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  };

  const handleGetNewQuote = () => {
    if (Engine.context.BridgeController?.resetState) {
      Engine.context.BridgeController.resetState();
    }
    updateQuoteParams();
  };

  const buttonIsInLoadingState =
    !needsNewQuote &&
    !hasError &&
    (isLoading || isSubmittingTx || isAwaitingQuote || isPendingQuoteRefresh) &&
    isSubmitDisabled;

  const label = useMemo(() => {
    if (needsNewQuote) {
      return strings('quote_expired_modal.get_new_quote');
    }

    if (!activeQuote || isLoading || !sourceAmount || sourceAmount === '0') {
      return strings('bridge.confirm_swap');
    }

    if (hasInsufficientBalance) return strings('bridge.insufficient_funds');
    if (!hasSufficientGas) return strings('bridge.insufficient_gas');
    if (isSubmittingTx) return strings('bridge.submitting_transaction');

    return strings('bridge.confirm_swap');
  }, [
    activeQuote,
    isLoading,
    sourceAmount,
    hasInsufficientBalance,
    hasSufficientGas,
    isSubmittingTx,
    needsNewQuote,
  ]);

  return (
    <Button
      variant={ButtonVariants.Primary}
      size={ButtonSize.Lg}
      loading={buttonIsInLoadingState}
      label={label}
      onPress={needsNewQuote ? handleGetNewQuote : handleContinue}
      width={ButtonWidthTypes.Full}
      testID={testID ?? BridgeViewSelectorsIDs.CONFIRM_BUTTON}
      isDisabled={needsNewQuote ? false : isSubmitDisabled}
    />
  );
};

import React, { useMemo, useEffect, useRef } from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { useSelector } from 'react-redux';
import {
  selectBridgeFeatureFlags,
  selectIsSolanaSourced,
  selectIsSubmittingTx,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import Engine from '../../../../../core/Engine';
import { calcTokenValue } from '../../../../../util/transactions';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { PriceImpactModalType } from '../PriceImpactModal/constants';
import { useNavigation } from '@react-navigation/native';
import AppConstants from '../../../../../core/AppConstants';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  /** Optional testID override (e.g. when rendered inside keypad to avoid duplicate IDs in E2E) */
  testID?: string;
  location: MetaMetricsSwapsEventSource;
}

export const SwapsConfirmButton = ({
  latestSourceBalance,
  testID,
  location,
}: Props) => {
  const navigation = useNavigation();
  const handleConfirm = useBridgeConfirm({
    latestSourceBalance,
    location,
  });

  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
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
    needsNewQuote,
    blockaidError,
    quoteFetchError,
    isNoQuotesAvailable,
  } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });

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
    const priceImpact = !activeQuote?.quote.priceData?.priceImpact
      ? // Default to zero to bypass swap friction.
        // This callback is always called when active quote exists,
        // thus this check is not expected to be used, but we introduce
        // it regardless as a defensive mechanism.
        0
      : Number.parseFloat(activeQuote.quote.priceData.priceImpact);

    if (
      Number.isFinite(priceImpact) &&
      priceImpact >=
        // @ts-expect-error TODO: remove comment after changes to core are published.
        (bridgeFeatureFlags?.priceImpactThreshold?.error ??
          AppConstants.BRIDGE.PRICE_IMPACT_ERROR_THRESHOLD)
    ) {
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL,
        params: {
          type: PriceImpactModalType.Execution,
          token: sourceToken,
          location,
        },
      });
      return;
    }

    await handleConfirm();
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

import React, { useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  /** Optional testID override (e.g. when rendered inside keypad to avoid duplicate IDs in E2E) */
  testID?: string;
  /** The entry point location for analytics (e.g. Main View, Token View, trending_explore) */
  location?: MetaMetricsSwapsEventSource;
}

export const SwapsConfirmButton = ({
  latestSourceBalance,
  testID,
  location,
}: Props) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
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

  const { activeQuote, isLoading, isExpired, blockaidError } =
    useBridgeQuoteData({
      latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
    });

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });

  // The quote expired and no fetch is in progress — offer to get a new one.
  const needsNewQuote = isExpired && !isLoading && !isSubmittingTx;

  const isSubmitDisabled =
    (isLoading && !activeQuote) ||
    hasInsufficientBalance ||
    isSubmittingTx ||
    (isHardwareAddress && isSolanaSourced) ||
    !!blockaidError ||
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
    (isLoading || isSubmittingTx) && isSubmitDisabled;

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

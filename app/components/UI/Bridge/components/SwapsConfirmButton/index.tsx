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
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import { BridgeQuoteResponse } from '../../types';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

export const SwapsConfirmButton = ({ latestSourceBalance }: Props) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { submitBridgeTx } = useSubmitBridgeTx();
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

  const { activeQuote, isLoading, blockaidError } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });

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
        });
      }
    } catch (error) {
      console.error('Error submitting bridge tx', error);
    } finally {
      dispatch(setIsSubmittingTx(false));
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  };

  const label = useMemo(() => {
    if (hasInsufficientBalance) return strings('bridge.insufficient_funds');
    if (!hasSufficientGas) return strings('bridge.insufficient_gas');
    if (isSubmittingTx) return strings('bridge.submitting_transaction');

    return strings('bridge.confirm_swap');
  }, [hasInsufficientBalance, hasSufficientGas, isSubmittingTx]);

  return (
    <Button
      variant={ButtonVariants.Primary}
      size={ButtonSize.Lg}
      label={label}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON}
      isDisabled={isSubmitDisabled}
    />
  );
};

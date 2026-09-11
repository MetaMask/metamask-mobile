import React from 'react';
import {
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import {
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../../hooks/useInsufficientNativeReserveError';
import { useIsNetworkFeeUnavailable } from '../../hooks/useIsNetworkFeeUnavailable';
import type { useLatestBalance } from '../../hooks/useLatestBalance';

interface Props {
  latestSourceBalance?: ReturnType<typeof useLatestBalance>;
  loading?: boolean;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  label: string;
}

export const SwapsLimitOrderConfirmButton = ({
  latestSourceBalance,
  loading,
  onPress,
  testID,
  disabled,
  label,
}: Props) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const { activeQuote, isLoading } = useBridgeQuoteDataContext();

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const insufficientNativeReserveError = useInsufficientNativeReserveError({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
    walletAddress,
    activeQuote,
  });

  const isNetworkFeeUnavailable = useIsNetworkFeeUnavailable(activeQuote);
  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });
  const hasInsufficientGas = !isNetworkFeeUnavailable && !hasSufficientGas;

  const hasInsufficientFunds =
    hasInsufficientBalance ||
    Boolean(insufficientNativeReserveError) ||
    isNetworkFeeUnavailable;

  // Gas and native-reserve checks read from the active quote, so their result is
  // only meaningful once a quote has settled. Before that the caller's `disabled`
  // already covers the button state.
  const hasSettledQuote = Boolean(activeQuote) && !isLoading;

  const isDisabled = Boolean(
    disabled || hasInsufficientFunds || hasInsufficientGas,
  );

  let resolvedLabel = label;
  if (hasSettledQuote && hasInsufficientFunds) {
    resolvedLabel = strings('bridge.insufficient_funds');
  } else if (hasSettledQuote && hasInsufficientGas) {
    resolvedLabel = strings('bridge.insufficient_gas');
  }

  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonBaseSize.Lg}
      isLoading={Boolean(loading) && resolvedLabel === label}
      onPress={onPress}
      isFullWidth
      testID={testID}
      isDisabled={isDisabled}
    >
      {resolvedLabel}
    </Button>
  );
};

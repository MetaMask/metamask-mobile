import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import PredictBuyAmountSection from '../../components/PredictBuyAmountSection';
import PredictBuyMinimumError from '../../components/PredictBuyMinimumError';
import PredictBuyActionButton from '../../components/PredictBuyActionButton';
import PredictBuyBottomContent from '../../components/PredictBuyBottomContent';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import PredictBuyPreviewHeader from '../../components/PredictBuyPreviewHeader/PredictBuyPreviewHeader';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictTransactionErrorDismissal } from '../../hooks/usePredictTransactionErrorDismissal';
import { selectPredictActiveOrder } from '../../selectors/predictController';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPrice } from '../../utils/format';
import { MINIMUM_BET } from '../../constants/transactions';
import { BigNumber } from 'bignumber.js';
import Routes from '../../../../../constants/navigation/Routes';
import {
  POLYGON_USDCE,
  PREDICT_CURRENCY,
} from '../../../../Views/confirmations/constants/predict';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useAddToken } from '../../../../Views/confirmations/hooks/tokens/useAddToken';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionCustomAmount } from '../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../../../../Views/confirmations/hooks/transactions/useUpdateTokenAmount';
import useClearConfirmationOnBackSwipe from '../../../../Views/confirmations/hooks/ui/useClearConfirmationOnBackSwipe';
import { usePredictPaymentToken } from '../../hooks/usePredictPaymentToken';
import { useConfirmActions } from '../../../../Views/confirmations/hooks/useConfirmActions';
import useApprovalRequest from '../../../../Views/confirmations/hooks/useApprovalRequest';
import { SafeAreaView } from 'react-native-safe-area-context';
import PredictFeeSummary from '../../components/PredictFeeSummary/PredictFeeSummary';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet/PredictFeeBreakdownSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { usePredictBuyInputState } from '../../hooks/usePredictBuyInputState';

export function PredictPayWithAnyTokenInfo() {
  const activeOrder = useSelector(selectPredictActiveOrder);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const tw = useTailwind();
  const { onReject } = useConfirmActions();
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();
  const market = activeOrder?.market;
  const outcome = activeOrder?.outcome;
  const outcomeToken = activeOrder?.outcomeToken;
  const transactionError = activeOrder?.transactionError;

  useClearConfirmationOnBackSwipe();

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_USDCE.decimals,
    name: POLYGON_USDCE.name,
    symbol: POLYGON_USDCE.symbol,
    tokenAddress: POLYGON_USDCE.address,
  });

  const { payToken } = useTransactionPayToken();

  const keypadRef = useRef<PredictKeypadHandles>(null);

  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { deposit } = usePredictDeposit();

  const {
    currentValue,
    setCurrentValue,
    currentValueUSDString,
    setCurrentValueUSDString,
    isInputFocused,
    setIsInputFocused,
    isUserInputChange,
    setIsUserInputChange,
  } = usePredictBuyInputState();

  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();

  usePredictTransactionErrorDismissal({
    amount: currentValue,
  });

  const {
    preview,
    error: previewError,
    isCalculating,
  } = usePredictOrderPreview({
    marketId: market?.id ?? '',
    outcomeId: outcome?.id ?? '',
    outcomeTokenId: outcomeToken?.id ?? '',
    side: Side.BUY,
    size: activeOrder ? currentValue : 0,
    autoRefreshTimeout: 1000,
  });

  useEffect(() => {
    if (!isCalculating) {
      setIsUserInputChange(false);
    }
  }, [isCalculating, setIsUserInputChange]);

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );

  const { toWin, metamaskFee, providerFee, total, isRateLimited } = useMemo(
    () => ({
      toWin: preview?.minAmountReceived ?? 0,
      metamaskFee: preview?.fees?.metamaskFee ?? 0,
      providerFee: preview?.fees?.providerFee ?? 0,
      total:
        currentValue +
        (preview?.fees?.providerFee ?? 0) +
        (preview?.fees?.metamaskFee ?? 0),
      isRateLimited: preview?.rateLimited ?? false,
    }),
    [currentValue, preview],
  );

  const activeTransactionMeta = useTransactionMetadataRequest();
  const redirectToBuyPreview = useCallback(
    ({ includeTransactionId }: { includeTransactionId: boolean }) => {
      if (!market || !outcome || !outcomeToken) {
        return;
      }

      navigation.dispatch(
        StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, {
          market,
          outcome,
          outcomeToken,
          ...(currentValue > 0 ? { amount: currentValue } : {}),
          ...(includeTransactionId && activeTransactionMeta?.id
            ? { transactionId: activeTransactionMeta.id }
            : {}),
          animationEnabled: false,
        }),
      );
    },
    [
      activeTransactionMeta?.id,
      currentValue,
      market,
      navigation,
      outcome,
      outcomeToken,
    ],
  );
  const handlePaymentTokenSelected = useCallback(
    (_selectedTokenAddress: string | null, selectedTokenKey: string | null) => {
      if (selectedTokenKey !== 'predict-balance') {
        return;
      }

      redirectToBuyPreview({ includeTransactionId: false });
      onReject(undefined, true);
    },
    [onReject, redirectToBuyPreview],
  );
  const { isPredictBalanceSelected } = usePredictPaymentToken({
    onTokenSelected: handlePaymentTokenSelected,
  });

  const depositAmount = useMemo(() => {
    if (isPredictBalanceSelected || total <= 0) {
      return '';
    }
    return new BigNumber(total)
      .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
      .toString(10);
  }, [isPredictBalanceSelected, total]);

  const { updatePendingAmount, amountHuman } = useTransactionCustomAmount({
    currency: PREDICT_CURRENCY,
  });

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

  useEffect(() => {
    if (depositAmount && depositAmount.trim() !== '' && activeTransactionMeta) {
      updatePendingAmount(depositAmount);
    }
  }, [depositAmount, activeTransactionMeta, updatePendingAmount]);

  useEffect(() => {
    if (
      amountHuman &&
      amountHuman !== '0' &&
      depositAmount &&
      depositAmount.trim() !== '' &&
      activeTransactionMeta
    ) {
      updateTokenAmountCallback(amountHuman);
    }
  }, [
    amountHuman,
    depositAmount,
    activeTransactionMeta,
    updateTokenAmountCallback,
  ]);

  const handleFeesInfoPress = useCallback(() => {
    setIsFeeBreakdownVisible(true);
  }, []);

  const handleFeeBreakdownClose = useCallback(() => {
    setIsFeeBreakdownVisible(false);
  }, []);

  const payTotals = useTransactionPayTotals();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const shouldWaitForPayFees = !isPredictBalanceSelected;
  const isPayFeesLoading = shouldWaitForPayFees && isPayTotalsLoading;

  const depositFeeUsd = useMemo(() => {
    if (isPredictBalanceSelected || !payTotals?.fees) return 0;
    const { provider, sourceNetwork, targetNetwork } = payTotals.fees;
    return new BigNumber(provider?.usd ?? 0)
      .plus(sourceNetwork?.estimate?.usd ?? 0)
      .plus(targetNetwork?.usd ?? 0)
      .toNumber();
  }, [isPredictBalanceSelected, payTotals]);

  const totalWithDepositFee = total + depositFeeUsd;
  const rewardsFeeAmountUsd = previewError
    ? undefined
    : (preview?.fees?.totalFee ?? 0);

  const handleConfirm = useCallback(async () => {
    if (isConfirming) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(undefined);

    try {
      redirectToBuyPreview({ includeTransactionId: true });
      await onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : strings('predict.deposit.error_description'),
      );
      setIsConfirming(false);
    }
  }, [isConfirming, onApprovalConfirm, redirectToBuyPreview]);

  useEffect(
    () => () => {
      if (isConfirming) return;
      onReject(undefined, true);
    },
    [isConfirming, onReject],
  );

  const canPlaceBet = useMemo(
    () =>
      currentValue >= MINIMUM_BET &&
      !!preview &&
      !isConfirming &&
      !isBalanceLoading &&
      !isRateLimited &&
      !isPayFeesLoading,
    [
      currentValue,
      preview,
      isConfirming,
      isBalanceLoading,
      isRateLimited,
      isPayFeesLoading,
    ],
  );

  const availableBalanceDisplay = useMemo(
    () =>
      isPredictBalanceSelected
        ? formatPrice(balance, {
            minimumDecimals: 2,
            maximumDecimals: 2,
          })
        : `$${Number(payToken?.balanceUsd ?? 0).toFixed(2)}`,
    [isPredictBalanceSelected, balance, payToken?.balanceUsd],
  );

  const errorMessage = useMemo(
    () => confirmError ?? transactionError ?? previewError,
    [confirmError, transactionError, previewError],
  );

  if (!activeOrder || !market || !outcome || !outcomeToken) {
    return null;
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'left', 'right']}
    >
      <PredictBuyPreviewHeader
        market={market}
        outcome={outcome}
        preview={preview}
      />
      <PredictBuyAmountSection
        currentValueUSDString={currentValueUSDString}
        keypadRef={keypadRef}
        isInputFocused={isInputFocused}
        isBalanceLoading={
          isBalanceLoading || (!isPredictBalanceSelected && !payToken)
        }
        availableBalanceDisplay={availableBalanceDisplay}
        toWin={toWin}
        isShowingToWinSkeleton={isCalculating && isUserInputChange}
      />
      <PredictBuyMinimumError
        isBalanceLoading={isBalanceLoading}
        isBelowMinimum={isBelowMinimum}
      />
      <PredictKeypad
        ref={keypadRef}
        isInputFocused={isInputFocused}
        currentValue={currentValue}
        currentValueUSDString={currentValueUSDString}
        setCurrentValue={setCurrentValue}
        setCurrentValueUSDString={setCurrentValueUSDString}
        setIsInputFocused={setIsInputFocused}
        onAddFunds={deposit}
      />
      <PredictBuyBottomContent
        isInputFocused={isInputFocused}
        errorMessage={errorMessage ?? undefined}
      >
        <PredictFeeSummary
          disabled={isInputFocused}
          loading={isPayFeesLoading}
          total={totalWithDepositFee}
          rewardsFeeAmountUsd={rewardsFeeAmountUsd}
          handleFeesInfoPress={handleFeesInfoPress}
        />
        <PredictBuyActionButton
          isLoading={isConfirming}
          onPress={handleConfirm}
          disabled={!canPlaceBet}
          showReducedOpacity={!canPlaceBet}
          outcomeTokenTitle={outcomeToken?.title}
          sharePrice={preview?.sharePrice ?? outcomeToken?.price ?? 0}
        />
      </PredictBuyBottomContent>
      {isFeeBreakdownVisible && (
        <PredictFeeBreakdownSheet
          ref={feeBreakdownSheetRef}
          providerFee={providerFee}
          metamaskFee={metamaskFee}
          depositFee={depositFeeUsd}
          sharePrice={preview?.sharePrice ?? outcomeToken?.price ?? 0}
          contractCount={preview?.minAmountReceived ?? 0}
          betAmount={currentValue}
          total={totalWithDepositFee}
          onClose={handleFeeBreakdownClose}
        />
      )}
    </SafeAreaView>
  );
}

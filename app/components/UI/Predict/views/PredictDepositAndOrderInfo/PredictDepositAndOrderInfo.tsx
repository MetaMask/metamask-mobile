import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Linking, ScrollView } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import PredictAmountDisplay from '../../components/PredictAmountDisplay';
import { PredictBuyPreviewHeaderTitle } from '../../components/PredictBuyPreviewHeader';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet';
import PredictFeeSummary from '../../components/PredictFeeSummary';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import { PayWithRowSkeleton } from '../../../../Views/confirmations/components/rows/pay-with-row/pay-with-row';
import { PredictPayWithRow } from '../../components/PredictPayWithRow';
import { usePredictActiveOrder } from '../../hooks/usePredictActiveOrder';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { usePredictOrderDepositTracking } from '../../hooks/usePredictOrderDepositTracking';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictRewards } from '../../hooks/usePredictRewards';
import { usePredictTrading } from '../../hooks/usePredictTrading';
import { Side } from '../../types';
import { formatCents, formatPrice } from '../../utils/format';
import { BigNumber } from 'bignumber.js';
import { useConfirmationContext } from '../../../../Views/confirmations/context/confirmation-context';
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
import useNavbar from '../../../../Views/confirmations/hooks/ui/useNavbar';
import { NavbarOverrides } from '../../../../Views/confirmations/components/UI/navbar/navbar';
import { usePredictPaymentToken } from '../../hooks/usePredictPaymentToken';
import useApprovalRequest from '../../../../Views/confirmations/hooks/useApprovalRequest';

const MINIMUM_BET = 1;

export function PredictDepositAndOrderInfo() {
  const activeOrder = usePredictActiveOrder();

  const market = activeOrder?.market;
  const outcome = activeOrder?.outcome;
  const outcomeToken = activeOrder?.outcomeToken;

  const renderHeaderTitle = useCallback(
    () =>
      outcomeToken ? (
        <PredictBuyPreviewHeaderTitle
          title={market?.title ?? ''}
          outcomeImage={outcome?.image}
          outcomeGroupTitle={outcome?.groupItemTitle ?? ''}
          outcomeToken={outcomeToken}
        />
      ) : null,
    [market?.title, outcome?.image, outcome?.groupItemTitle, outcomeToken],
  );

  const navbarOverrides = useMemo<NavbarOverrides>(
    () => ({
      headerTitleAlign: 'left' as const,
      headerTitle: renderHeaderTitle,
    }),
    [renderHeaderTitle],
  );

  useNavbar(strings('confirm.title.predict_deposit'), true, navbarOverrides);
  useClearConfirmationOnBackSwipe();

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_USDCE.decimals,
    name: POLYGON_USDCE.name,
    symbol: POLYGON_USDCE.symbol,
    tokenAddress: POLYGON_USDCE.address,
  });

  const { payToken } = useTransactionPayToken();
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const previousValueRef = useRef(0);
  const { setIsFooterVisible } = useConfirmationContext();

  const navigation = useNavigation();
  const { trackDeposit } = usePredictOrderDepositTracking();
  const { placeOrder } = usePredictTrading();

  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { deposit } = usePredictDeposit();

  const [currentValue, setCurrentValue] = useState(0);
  const [currentValueUSDString, setCurrentValueUSDString] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [isUserInputChange, setIsUserInputChange] = useState(false);
  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();

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
      if (currentValue === 0) {
        previousValueRef.current = 0;
      }
      return;
    }

    if (
      currentValue > 0 &&
      currentValue !== previousValueRef.current &&
      isCalculating
    ) {
      setIsUserInputChange(true);
    }

    previousValueRef.current = currentValue;
  }, [currentValue, isCalculating]);

  useEffect(() => {
    setIsFooterVisible(false);
  }, [setIsFooterVisible]);

  const isBelowMinimum = currentValue > 0 && currentValue < MINIMUM_BET;
  const isRateLimited = preview?.rateLimited ?? false;

  const toWin = preview?.minAmountReceived ?? 0;
  const metamaskFee = preview?.fees?.metamaskFee ?? 0;
  const providerFee = preview?.fees?.providerFee ?? 0;
  const total = currentValue + providerFee + metamaskFee;

  const activeTransactionMeta = useTransactionMetadataRequest();

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

  const payTotals = useTransactionPayTotals();
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();
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

  const canPlaceBet =
    currentValue >= MINIMUM_BET &&
    preview &&
    !isConfirming &&
    !isBalanceLoading &&
    !isRateLimited &&
    !isPayFeesLoading;

  const previewRef = useRef(preview);
  previewRef.current = preview;

  const handleConfirm = useCallback(async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    setConfirmError(undefined);

    const analyticsProps = {
      marketId: market?.id,
      outcome: outcome?.id,
    };

    if (isPredictBalanceSelected) {
      try {
        const latestPreview = previewRef.current;
        if (!latestPreview) return;

        await placeOrder({
          preview: latestPreview,
          analyticsProperties: analyticsProps,
        });
      } catch (err) {
        setConfirmError(
          err instanceof Error
            ? err.message
            : strings('predict.deposit.error_description'),
        );
      } finally {
        setIsConfirming(false);
        navigation.goBack();
      }
      return;
    }

    if (!activeTransactionMeta) return;

    try {
      trackDeposit({
        transactionMeta: activeTransactionMeta,
        onConfirmed: async () => {
          const latestPreview = previewRef.current;
          if (!latestPreview) return;

          try {
            await placeOrder({
              preview: latestPreview,
              analyticsProperties: analyticsProps,
            });
          } catch (err) {
            setConfirmError(
              err instanceof Error
                ? err.message
                : strings('predict.deposit.error_description'),
            );
          } finally {
            setIsConfirming(false);
            navigation.goBack();
          }
        },
        onFailed: () => {
          setConfirmError(strings('predict.deposit.error_description'));
          setIsConfirming(false);
        },
      });

      onApprovalConfirm({
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
  }, [
    isConfirming,
    isPredictBalanceSelected,
    activeTransactionMeta,
    trackDeposit,
    onApprovalConfirm,
    placeOrder,
    market?.id,
    outcome?.id,
    navigation,
  ]);

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

  const {
    enabled: isRewardsEnabled,
    isLoading: isRewardsLoading,
    accountOptedIn: isAccountOptedIntoRewards,
    rewardsAccountScope,
    estimatedPoints: estimatedRewardsPoints,
    hasError: isRewardsError,
  } = usePredictRewards(
    previewError ? undefined : (preview?.fees?.totalFee ?? 0),
  );

  const shouldShowRewardsRow =
    isRewardsEnabled && currentValue > 0 && isAccountOptedIntoRewards != null;

  const handleFeesInfoPress = useCallback(() => {
    setIsFeeBreakdownVisible(true);
  }, []);

  const handleFeeBreakdownClose = useCallback(() => {
    setIsFeeBreakdownVisible(false);
  }, []);

  useEffect(() => {
    if (isFeeBreakdownVisible) {
      feeBreakdownSheetRef.current?.onOpenBottomSheet();
    }
  }, [isFeeBreakdownVisible]);

  if (!activeOrder || !market || !outcome || !outcomeToken) {
    return null;
  }

  const renderAmount = () => (
    <ScrollView
      style={tw.style('flex-col')}
      contentContainerStyle={tw.style('flex-grow justify-center')}
      showsVerticalScrollIndicator={false}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="w-full"
      >
        <Box twClassName="text-center leading-[72px]">
          <PredictAmountDisplay
            amount={currentValueUSDString}
            onPress={() => keypadRef.current?.handleAmountPress()}
            isActive={isInputFocused}
            hasError={false}
          />
        </Box>
        <Box twClassName="text-center mt-2">
          {isBalanceLoading ? (
            <Skeleton width={120} height={20} />
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {`${strings('predict.order.available')}: `}
              {availableBalanceDisplay}
            </Text>
          )}
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="mt-2"
        >
          <Text
            variant={TextVariant.BodyLg}
            twClassName="font-medium"
            color={TextColor.SuccessDefault}
          >
            {`${strings('predict.order.to_win')} `}
          </Text>
          {isCalculating && isUserInputChange ? (
            <Skeleton width={80} height={24} style={tw.style('rounded-md')} />
          ) : (
            <Text
              variant={TextVariant.BodyLg}
              twClassName="font-medium"
              color={TextColor.SuccessDefault}
            >
              {formatPrice(toWin, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              })}
            </Text>
          )}
        </Box>
        <Box twClassName="mt-4 w-full">
          {isBalanceLoading ? <PayWithRowSkeleton /> : <PredictPayWithRow />}
        </Box>
      </Box>
    </ScrollView>
  );

  const renderErrorMessage = () => {
    if (isBalanceLoading) {
      return null;
    }

    if (isBelowMinimum) {
      return (
        <Box twClassName="px-12 pb-4">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            style={tw.style('text-center')}
          >
            {strings('predict.order.prediction_minimum_bet', {
              amount: formatPrice(MINIMUM_BET, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              }),
            })}
          </Text>
        </Box>
      );
    }

    return null;
  };

  const errorMessage = previewError ?? confirmError;

  const renderActionButton = () => {
    if (isConfirming) {
      return (
        <Button
          label={
            <Box twClassName="flex-row items-center gap-1">
              <ActivityIndicator size="small" />
              <Text
                variant={TextVariant.BodyLg}
                twClassName="font-medium"
                color={TextColor.PrimaryInverse}
              >
                {`${strings('predict.order.placing_prediction')}...`}
              </Text>
            </Box>
          }
          variant={ButtonVariants.Primary}
          onPress={handleConfirm}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          style={tw.style('opacity-50')}
          disabled
        />
      );
    }

    return (
      <Button
        size={ButtonSize.Lg}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        disabled={!canPlaceBet}
        onPress={handleConfirm}
        style={tw.style(!canPlaceBet ? 'opacity-50' : '')}
        label={
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.PrimaryInverse}
            twClassName="font-medium"
          >
            {outcomeToken?.title} ·{' '}
            {formatCents(preview?.sharePrice ?? outcomeToken?.price ?? 0)}
          </Text>
        }
      />
    );
  };

  const renderFeesSummary = () => {
    if (isInputFocused) {
      return null;
    }

    if (isPayFeesLoading) {
      return (
        <Box twClassName="pt-4 px-4 pb-6 flex-col gap-4">
          <Box twClassName="flex-row justify-between items-center">
            <Box twClassName="flex-row gap-2 items-center">
              <Skeleton width={64} height={16} />
            </Box>
            <Skeleton width={44} height={16} />
          </Box>
          <Box twClassName="flex-row justify-between items-center">
            <Box twClassName="flex-row items-center">
              <Skeleton width={36} height={16} />
              <Box twClassName="ml-1">
                <Skeleton
                  width={16}
                  height={16}
                  style={tw.style('rounded-full')}
                />
              </Box>
            </Box>
            <Skeleton width={60} height={16} />
          </Box>
          <Box twClassName="flex-row justify-between items-center">
            <Box twClassName="flex-row gap-2 items-center">
              <Skeleton width={40} height={16} />
            </Box>
            <Skeleton width={64} height={16} />
          </Box>
        </Box>
      );
    }

    return (
      <PredictFeeSummary
        disabled={isInputFocused}
        total={totalWithDepositFee}
        metamaskFee={metamaskFee}
        providerFee={providerFee}
        depositFee={depositFeeUsd}
        shouldShowRewardsRow={shouldShowRewardsRow}
        rewardsAccountScope={rewardsAccountScope}
        accountOptedIn={isAccountOptedIntoRewards}
        estimatedPoints={estimatedRewardsPoints}
        isLoadingRewards={
          (isCalculating && isUserInputChange) || isRewardsLoading
        }
        hasRewardsError={isRewardsError}
        onFeesInfoPress={handleFeesInfoPress}
      />
    );
  };

  const renderBottomContent = () => {
    if (isInputFocused) {
      return null;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="border-t border-muted p-4 pb-0 gap-4"
      >
        <Box justifyContent={BoxJustifyContent.Center} twClassName="gap-2">
          {errorMessage && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              style={tw.style('text-center pb-2')}
            >
              {errorMessage}
            </Text>
          )}
          <Box twClassName="w-full h-12">{renderActionButton()}</Box>
          <Box twClassName="text-center items-center flex-row gap-1 justify-center">
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('predict.consent_sheet.disclaimer')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              style={tw.style('text-info-default')}
              onPress={() => {
                Linking.openURL('https://polymarket.com/tos');
              }}
            >
              {strings('predict.consent_sheet.learn_more')}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box twClassName="flex-1">
      {renderAmount()}
      {renderFeesSummary()}
      {renderErrorMessage()}
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
      {renderBottomContent()}
      {isFeeBreakdownVisible && (
        <PredictFeeBreakdownSheet
          ref={feeBreakdownSheetRef}
          providerFee={providerFee}
          metamaskFee={metamaskFee}
          depositFee={depositFeeUsd}
          onClose={handleFeeBreakdownClose}
        />
      )}
    </Box>
  );
}
